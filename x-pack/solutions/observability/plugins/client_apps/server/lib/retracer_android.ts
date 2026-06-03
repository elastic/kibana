/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Retracer } from './retracer';

/**
 * One Elasticsearch document per obfuscated R8 class. The fetcher
 * takes a list of obfuscated class names and returns the matching
 * documents. `_id` in Elasticsearch is `SHA-256(obfuscated_class)`.
 */
export interface AndroidClassMap {
  /**
   * Version of the document format. Goes up only when a consumer
   * must change to keep working (a field renamed, removed, etc.).
   * Documents with a version this retracer doesn't understand are
   * skipped, since deobfuscating them partially could be wrong.
   */
  schema_version: number;
  /**
   * Version of R8's mapping format, taken from the
   * `# {"id":"com.android.tools.r8.mapping","version":"..."}` line
   * at the top of `mapping.txt` (e.g. `"2.2"`).
   *
   * If newer than `MAX_KNOWN_MAP_VERSION`, the retracer still tries
   * its best and logs one warning per retrace.
   */
  map_version?: string;
  /**
   * The obfuscated class name (e.g. `"y1"`). Used as the fetcher's
   * lookup key and shown on every frame from this class.
   */
  obfuscated_class: string;
  /**
   * The original (unobfuscated) class name. Always present. Also
   * used to deobfuscate exception class names in the trace.
   */
  original_class: string;
  /**
   * The class's source file (e.g. `"MainActivity.kt"`), taken from
   * R8's `sourceFile` comment. Default for entries that don't have
   * their own. If R8 didn't emit one, the retracer guesses a name
   * from `original_class`.
   */
  source_file?: string;
  /**
   * Mapping entries for this class, keyed by **obfuscated** method
   * name. If a method isn't here, its frame is left obfuscated.
   */
  methods: Record<string, AndroidMethodDocument>;
}

/**
 * All mapping entries for one obfuscated method.
 *
 * R8 has two kinds of entries: **ranged entries** (with obfuscated
 * and original line ranges) and **default entries** (the fallback).
 * The retracer checks `mappings` first, then `default_mappings`.
 */
interface AndroidMethodDocument {
  /**
   * Ranged entries. Multiple entries with the same `obf_range`
   * form an **inline chain** (innermost first). When matched, one
   * obfuscated frame becomes several output frames.
   */
  mappings: AndroidMappingEntry[];
  /**
   * Fallback entries with no range. Used when no ranged entry
   * covers the obfuscated line — usually because the original
   * method had no line numbers (e.g. generated methods).
   */
  default_mappings?: AndroidDefaultMappingEntry[];
}

/**
 * A ranged mapping entry. Maps an obfuscated line range back to an
 * original line range, plus optional cross-class overrides for
 * inlined frames and R8 `extras` (outline, synthesized, rewriteFrame).
 */
interface AndroidMappingEntry {
  /** Obfuscated `[start, end]` line range covered by this entry. */
  obf_range: [number, number];
  /**
   * Original `[start, end]` line range. The retracer picks a line
   * inside this range based on where the obfuscated line falls in
   * `obf_range`. Always kept inside the range so we don't report a
   * line that doesn't exist in the source.
   */
  orig_range: [number, number];
  /** Original (unobfuscated) method name to show. */
  method: string;
  /**
   * Class-name override. Set on **cross-class inlines** — R8 inlined
   * a method from class B into class A; the entry lives in class A's
   * document but the frame should show class B. Missing for
   * same-class entries (the host class's `original_class` is used).
   */
  class?: string;
  /**
   * Source-file override, used the same way as `class`. Set when a
   * cross-class inline's source file differs from the host's
   * `source_file`. Missing for same-class entries.
   */
  source_file?: string;
  /**
   * R8 mapping comments passed through as JSON. Each one has an
   * `id` plus id-specific fields. Today the retracer recognizes:
   *
   *   - `com.android.tools.r8.outline`
   *   - `com.android.tools.r8.outlineCallsite`
   *   - `com.android.tools.r8.rewriteFrame`
   *   - `com.android.tools.r8.synthesized`
   *
   * Other ids are ignored, so new R8 features don't break things
   * until the retracer is taught about them.
   */
  extras?: R8Extra[];
}

/**
 * A fallback entry with no obfuscated range. Used when no ranged
 * entry's `obf_range` matches the obfuscated line.
 */
interface AndroidDefaultMappingEntry {
  /** Original (unobfuscated) method name to show. */
  method: string;
  /** Cross-class inline override; see `AndroidMappingEntry.class`. */
  class?: string;
  /** Cross-class inline override; see `AndroidMappingEntry.source_file`. */
  source_file?: string;
  /**
   * Original `[start, end]` line range for entries written like
   * `void method1():42:42 -> a`. Missing for entries with no range
   * (`void foo() -> a`). When set, the retracer shows the start of
   * the range on the output frame.
   */
  orig_range?: [number, number];
}

/**
 * One R8 mapping comment, kept as JSON. The `id` decides what kind
 * of extra it is; the other fields depend on that. Today the retracer
 * recognizes four ids (see `AndroidMappingEntry.extras`); other ids
 * are ignored.
 */
interface R8Extra {
  /** Full R8 extra id (e.g. `"com.android.tools.r8.outline"`). */
  id: string;
  /**
   * Used by `rewriteFrame`. Only `"throws(<exception-class>)"` is
   * understood today. Any other shape doesn't match — that way an
   * action is never applied for a condition we don't understand.
   */
  conditions?: string[];
  /**
   * Used by `rewriteFrame`. The action to run when the conditions
   * match (e.g. `"removeInnerFrames(1)"`).
   */
  actions?: string[];
  /**
   * Used by `outlineCallsite`. Maps obfuscated line numbers in the
   * outline body back to the call-site line in the host method.
   */
  positions?: Record<string, number>;
}

/** Schema generation this retracer understands. */
const SUPPORTED_SCHEMA_VERSION = 1;

/**
 * Highest R8 mapping format version this retracer has been tested
 * against. Newer documents are still retraced (best effort), with one
 * warning per retrace so operators know the retracer may need an
 * update.
 *
 * Only raise this number after checking R8's release notes for
 * changes since the last tested version, adding fixtures for any new
 * behaviour, and confirming the algorithm still matches.
 */
const MAX_KNOWN_MAP_VERSION = '2.2';

/**
 * Compares two R8 map-version strings (dotted decimals like
 * `"1.0"`, `"2.10"`). Compares each number, so future versions like
 * `"2.10"` are correctly greater than `"2.2"`.
 *
 * Returns negative if `a < b`, zero if equal, positive if `a > b`.
 *
 * Malformed values sort as newer than anything known, which triggers
 * the warning path — better to flag an unfamiliar value than to guess.
 */
function compareMapVersion(a: string, b: string): number {
  const parse = (v: string): number[] | null => {
    if (!MAP_VERSION_PARTS_RE.test(v)) return null;
    return v.split('.').map((part) => Number.parseInt(part, 10));
  };
  const aParts = parse(a);
  const bParts = parse(b);
  if (aParts === null) return 1;
  if (bParts === null) return -1;
  const len = Math.max(aParts.length, bParts.length);
  for (let i = 0; i < len; i++) {
    const ai = aParts[i] ?? 0;
    const bi = bParts[i] ?? 0;
    if (ai !== bi) return ai - bi;
  }
  return 0;
}

/** Internal shape: one ES document, parsed for fast method lookup. */
interface ClassDocument {
  obfuscatedClass: string;
  originalClass: string;
  sourceFile?: string;
  methods: Map<string, MethodDocument>;
}

interface MethodDocument {
  mappings: MappingEntry[];
  defaultMappings: DefaultMapping[];
}

interface MappingEntry {
  obfStart: number;
  obfEnd: number;
  origStart: number;
  origEnd: number;
  originalCall: OriginalCall;
  extras: R8Extra[];
}

interface DefaultMapping {
  originalCall: OriginalCall;
  /** Original line to show when the obfuscated frame has no match. */
  lineNumber?: number;
}

interface OriginalCall {
  /** Fully-qualified `Class.method`. */
  call: string;
  /** Just the class part. */
  className: string;
  /** Just the method part. */
  methodName: string;
  /** Resolved source file (entry override → class doc → inferred). */
  sourceFile?: string;
}

const ParsedLineType = {
  Frame: 'frame',
  Text: 'text',
} as const;
type ParsedLineType = (typeof ParsedLineType)[keyof typeof ParsedLineType];

interface ParsedFrame {
  type: typeof ParsedLineType.Frame;
  originalLine: string;
  indent: string;
  methodCall: string;
  className: string;
  methodName: string;
  sourceInfo: string;
  lineNumber?: number;
}

interface ParsedTextLine {
  type: typeof ParsedLineType.Text;
  className?: string;
  originalLine: string;
}

type ParsedLine = ParsedFrame | ParsedTextLine;

interface ResolvedFrame {
  call: OriginalCall;
  lineNumber?: number;
  entry?: MappingEntry;
}

const OUTLINE_ID = 'com.android.tools.r8.outline';
const OUTLINE_CALLSITE_ID = 'com.android.tools.r8.outlineCallsite';
const REWRITE_FRAME_ID = 'com.android.tools.r8.rewriteFrame';
const SYNTHESIZED_ID = 'com.android.tools.r8.synthesized';
/**
 * Source-file values that should pass through retracing unchanged,
 * so native frames stay `(Native Method)` even when their class is
 * in the mapping.
 */
const KEEP_SOURCE_INFO = new Set<string>(['Native Method']);

/** Precompiled patterns used on every stack line or hot merge paths. */
const MAP_VERSION_PARTS_RE = /^\d+(\.\d+)*$/;
const STACK_FRAME_LINE_RE = /^(\s*)at\s+(.+)\((.*)\)$/;
const THROWABLE_CLASS_NAME_RE =
  /^(\s*(?:Caused by:\s+|Suppressed:\s+)?)([A-Za-z_$][\w.$]*)(?::|$)/;
const REMOVE_INNER_FRAMES_RE = /^removeInnerFrames\((\d+)\)$/;
const THROWS_CONDITION_RE = /^throws\((.*)\)$/;

export class RetracerAndroid extends Retracer<AndroidClassMap> {
  async retrace(): Promise<string | undefined> {
    const lines = this._stackTrace.split('\n');
    const parsedLines: ParsedLine[] = [];
    const obfuscatedClasses = new Set<string>();

    for (const line of lines) {
      const parsedLine = parseStackTraceLine(line);
      if (parsedLine.className) {
        obfuscatedClasses.add(parsedLine.className);
      }
      parsedLines.push(parsedLine);
    }

    let classMaps: AndroidClassMap[];
    try {
      classMaps = await this._fetcher.fetch(Array.from(obfuscatedClasses));
    } catch {
      return this._stackTrace;
    }

    if (classMaps.length === 0) {
      return this._stackTrace;
    }

    const documents = new Map<string, ClassDocument>();
    const unrecognizedVersions = new Set<string>();
    let unrecognizedDocCount = 0;
    for (const classMap of classMaps) {
      if (classMap.schema_version !== SUPPORTED_SCHEMA_VERSION) {
        continue;
      }
      // map_version check. If the document's R8 mapping format
      // is newer than what this retracer was tested against, we
      // still retrace (R8 only tweaks the format incrementally,
      // so most frames are still correct) but log a warning so
      // operators know an update may be needed. A null version
      // means there was no version comment, which R8 treats as
      // 1.0 — no warning needed.
      if (
        classMap.map_version != null &&
        compareMapVersion(classMap.map_version, MAX_KNOWN_MAP_VERSION) > 0
      ) {
        unrecognizedVersions.add(classMap.map_version);
        unrecognizedDocCount++;
      }
      const document = parseClassDocument(classMap);
      documents.set(document.obfuscatedClass, document);
    }

    if (unrecognizedDocCount > 0) {
      // Sort numerically with `compareMapVersion` so `"9.9"`
      // comes before `"10.0"` (a string sort would get this
      // wrong). Malformed values are grouped at the end.
      const versions = Array.from(unrecognizedVersions)
        .sort((a, b) => compareMapVersion(a, b))
        .join(', ');
      this._logger.warn(
        `[stack-reframe] R8 map_version mismatch: ${unrecognizedDocCount} document(s) ` +
          `declare versions [${versions}] which exceed MAX_KNOWN_MAP_VERSION ` +
          `(${MAX_KNOWN_MAP_VERSION}). Retracing best-effort; results may be ` +
          `inaccurate. Update the retracer to extend MAX_KNOWN_MAP_VERSION.`
      );
    }

    const exceptionType = findExceptionType(parsedLines, documents);
    const output: string[] = [];
    let carryOutlinePosition: number | undefined;
    let frameIndex = 0;

    for (const line of parsedLines) {
      if (line.type === ParsedLineType.Text) {
        // Header lines (exception class names, "Caused by",
        // etc.) are wrapped in try/catch too. A bad document
        // could make `deobfuscateExceptionClassName` throw;
        // falling back to the original line keeps the rest
        // of the trace usable.
        try {
          output.push(deobfuscateExceptionClassName(line.originalLine, documents));
        } catch {
          output.push(line.originalLine);
        }
        continue;
      }

      // Per-frame safety net. If retracing one frame fails (bad
      // extras, unexpected types, an unknown mapping shape),
      // don't lose the rest of the trace. Save the carry, run
      // the pipeline, and on failure output the original frame
      // and drop the carry — passing a possibly-bad position
      // forward could mess up the next frame too.
      const consumedCarry = carryOutlinePosition;
      carryOutlinePosition = undefined;
      try {
        const result = retraceFrame(line, documents, consumedCarry, frameIndex, exceptionType);
        output.push(...result.output);
        carryOutlinePosition = result.nextCarryOutlinePosition;
      } catch {
        output.push(line.originalLine);
      }
      frameIndex++;
    }

    return output.join('\n');
  }
}

interface FrameResult {
  output: string[];
  nextCarryOutlinePosition: number | undefined;
}

function retraceFrame(
  line: ParsedFrame,
  documents: Map<string, ClassDocument>,
  carryOutlinePosition: number | undefined,
  frameIndex: number,
  exceptionType: string | undefined
): FrameResult {
  const document = documents.get(line.className);
  const method = document?.methods.get(line.methodName);
  if (!method) {
    return {
      output: [formatUnmappedFrame(line, document)],
      nextCarryOutlinePosition: undefined,
    };
  }

  let lineNumber = line.lineNumber;
  if (carryOutlinePosition !== undefined) {
    // If the outline callsite map has no entry for this carry
    // position, use the carry position as-is so range lookups
    // can still find a matching entry.
    lineNumber =
      findOutlineCallsiteLine(method, carryOutlinePosition) ?? carryOutlinePosition;
  }

  // A few special source-file strings (like `Native Method`)
  // should pass through unchanged even when the class is in the
  // mapping. Forward the original `sourceInfo` so the formatter
  // can keep it.
  const keepSourceInfo = KEEP_SOURCE_INFO.has(line.sourceInfo) ? line.sourceInfo : undefined;

  const matchedEntries = findMatchingEntries(method.mappings, lineNumber);
  if (matchedEntries.length > 0) {
    let hasOutline = false;
    const nonOutlineEntries: MappingEntry[] = [];
    for (let i = 0; i < matchedEntries.length; i++) {
      const entry = matchedEntries[i]!;
      if (hasExtra(entry, OUTLINE_ID)) {
        hasOutline = true;
      } else {
        nonOutlineEntries.push(entry);
      }
    }
    if (hasOutline) {
      const nonOutlineFrames = resolveEntries(nonOutlineEntries, lineNumber);
      return {
        output: nonOutlineFrames.map((frame) =>
          formatResolvedFrame(line.indent, frame, keepSourceInfo)
        ),
        nextCarryOutlinePosition: line.lineNumber,
      };
    }

    let resolvedFrames = resolveEntries(matchedEntries, lineNumber);
    resolvedFrames = stripOutermostSynthesizedFrame(resolvedFrames);

    if (frameIndex === 0) {
      resolvedFrames = applyRewriteFrame(resolvedFrames, exceptionType);
    }

    return {
      output: resolvedFrames.map((frame) =>
        formatResolvedFrame(line.indent, frame, keepSourceInfo)
      ),
      nextCarryOutlinePosition: undefined,
    };
  }

  // Default mappings are only used when the method has NO ranged
  // entries (e.g. `void method1():42:42 -> a`). If the method has
  // ranged entries but none matched, the frame is left unchanged —
  // defaults aren't checked because the ranged entries already
  // describe what the method covers, and this line is outside it.
  const defaultFrames =
    method.mappings.length === 0
      ? method.defaultMappings.map((mapping) => ({
          call: mapping.originalCall,
          lineNumber: mapping.lineNumber,
        }))
      : [];
  if (defaultFrames.length > 0) {
    return {
      output: defaultFrames.map((frame) =>
        formatResolvedFrame(line.indent, frame, keepSourceInfo)
      ),
      nextCarryOutlinePosition: undefined,
    };
  }
  if (lineNumber === undefined) {
    const ambiguousFrames = resolveUniqueOriginalCalls(method.mappings);
    if (ambiguousFrames.length > 0) {
      return {
        output: ambiguousFrames.map((frame) =>
          formatResolvedFrame(line.indent, frame, keepSourceInfo)
        ),
        nextCarryOutlinePosition: undefined,
      };
    }
  }
  return {
    output: [formatUnmappedFrame(line, document)],
    nextCarryOutlinePosition: undefined,
  };
}

function parseStackTraceLine(line: string): ParsedLine {
  const match = line.match(STACK_FRAME_LINE_RE);
  if (!match) {
    return {
      type: ParsedLineType.Text,
      originalLine: line,
      className: extractThrowableClassName(line),
    };
  }

  const methodCall = match[2]!;
  const lastDot = methodCall.lastIndexOf('.');
  const sourceInfo = match[3]!;
  return {
    type: ParsedLineType.Frame,
    originalLine: line,
    indent: match[1]!,
    methodCall,
    className: lastDot === -1 ? methodCall : methodCall.slice(0, lastDot),
    methodName: lastDot === -1 ? methodCall : methodCall.slice(lastDot + 1),
    sourceInfo,
    lineNumber: parseLineNumber(sourceInfo),
  };
}

function parseLineNumber(sourceInfo: string): number | undefined {
  const match = sourceInfo.match(/:(\d+)$/);
  return match ? Number.parseInt(match[1]!, 10) : undefined;
}

function parseClassDocument(classMap: AndroidClassMap): ClassDocument {
  const docSourceFile = classMap.source_file;
  const methods = new Map<string, MethodDocument>();
  for (const [obfMethod, methodDoc] of Object.entries(classMap.methods)) {
    methods.set(
      obfMethod,
      parseMethodDocument(methodDoc, classMap.original_class, docSourceFile)
    );
  }
  return {
    obfuscatedClass: classMap.obfuscated_class,
    originalClass: classMap.original_class,
    sourceFile: docSourceFile,
    methods,
  };
}

function parseMethodDocument(
  methodDoc: AndroidMethodDocument,
  docOriginalClass: string,
  docSourceFile: string | undefined
): MethodDocument {
  return {
    mappings: methodDoc.mappings.map((entry) =>
      parseMappingEntry(entry, docOriginalClass, docSourceFile)
    ),
    defaultMappings: (methodDoc.default_mappings ?? []).map((entry) => ({
      originalCall: resolveOriginalCall(
        entry.method,
        entry.class,
        entry.source_file,
        docOriginalClass,
        docSourceFile
      ),
      lineNumber: entry.orig_range?.[0],
    })),
  };
}

function parseMappingEntry(
  entry: AndroidMappingEntry,
  docOriginalClass: string,
  docSourceFile: string | undefined
): MappingEntry {
  return {
    obfStart: entry.obf_range[0],
    obfEnd: entry.obf_range[1],
    origStart: entry.orig_range[0],
    origEnd: entry.orig_range[1],
    originalCall: resolveOriginalCall(
      entry.method,
      entry.class,
      entry.source_file,
      docOriginalClass,
      docSourceFile
    ),
    extras: entry.extras ?? [],
  };
}

/**
 * Builds the OriginalCall for one mapping or default entry, picking
 * a source file with these rules:
 *
 * - If the entry has its own `source_file`, use it.
 * - Else if the entry has a `class` override (cross-class inline), do
 *   NOT use the document's `source_file` — that file is for the
 *   *outer* class, not the inlined one. Guess from the inlinee's
 *   class name instead. The upload pipeline already fills in the
 *   source file when the inlinee class is in the mapping; the guess
 *   only kicks in for classes outside the mapping (e.g. `kotlin.*`).
 * - Otherwise use the document's `source_file`, or guess if missing.
 */
function resolveOriginalCall(
  method: string,
  entryClass: string | undefined,
  entrySourceFile: string | undefined,
  docOriginalClass: string,
  docSourceFile: string | undefined
): OriginalCall {
  const originalClass = entryClass ?? docOriginalClass;
  const call = `${originalClass}.${method}`;

  let resolvedSourceFile = entrySourceFile;
  if (!resolvedSourceFile && entryClass === undefined) {
    resolvedSourceFile = docSourceFile;
  }
  resolvedSourceFile = resolvedSourceFile ?? inferSourceFile(originalClass, call);

  return {
    call,
    className: originalClass,
    methodName: method,
    sourceFile: resolvedSourceFile,
  };
}

function findExceptionType(
  parsedLines: ParsedLine[],
  documents: Map<string, ClassDocument>
): string | undefined {
  for (const line of parsedLines) {
    if (line.type === ParsedLineType.Frame) {
      continue;
    }
    const className = line.className;
    if (!className) {
      continue;
    }
    const deobfuscated = documents.get(className)?.originalClass ?? className;
    if (deobfuscated.includes('.') || documents.has(className)) {
      return `L${deobfuscated.replace(/\./g, '/')};`;
    }
  }
  return undefined;
}

function deobfuscateExceptionClassName(
  line: string,
  documents: Map<string, ClassDocument>
): string {
  const className = extractThrowableClassName(line);
  if (!className) {
    return line;
  }
  const original = documents.get(className)?.originalClass;
  return original ? line.replace(className, original) : line;
}

function extractThrowableClassName(line: string): string | undefined {
  const match = line.match(THROWABLE_CLASS_NAME_RE);
  return match ? match[2] : undefined;
}

function findOutlineCallsiteLine(
  method: MethodDocument,
  outlinePosition: number
): number | undefined {
  const key = String(outlinePosition);
  for (let mi = 0; mi < method.mappings.length; mi++) {
    const extras = method.mappings[mi]!.extras;
    for (let ei = 0; ei < extras.length; ei++) {
      const extra = extras[ei]!;
      if (extra.id === OUTLINE_CALLSITE_ID) {
        const position = extra.positions?.[key];
        if (position !== undefined) {
          return position;
        }
        break;
      }
    }
  }
  return undefined;
}

function findMatchingEntries(
  entries: MappingEntry[],
  lineNumber: number | undefined
): MappingEntry[] {
  if (lineNumber === undefined) {
    return [];
  }
  return entries.filter(
    (entry) => lineNumber >= entry.obfStart && lineNumber <= entry.obfEnd
  );
}

function resolveEntries(
  entries: MappingEntry[],
  lineNumber: number | undefined
): ResolvedFrame[] {
  return entries.map((entry) => ({
    call: entry.originalCall,
    lineNumber:
      lineNumber === undefined ? undefined : interpolateLineNumber(entry, lineNumber),
    entry,
  }));
}

function resolveUniqueOriginalCalls(entries: MappingEntry[]): ResolvedFrame[] {
  const seen = new Set<string>();
  const frames: ResolvedFrame[] = [];
  for (const entry of entries) {
    const key = formatCall(entry.originalCall);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    frames.push({ call: entry.originalCall });
  }
  return frames;
}

function interpolateLineNumber(entry: MappingEntry, obfuscatedLineNumber: number): number {
  if (entry.origStart === entry.origEnd) {
    return entry.origEnd;
  }
  // Some ranges are ambiguous: `obf_range` and `orig_range` are
  // different sizes, so the simple formula can give a line outside
  // the original range. Keep the result inside `[origStart, origEnd]`
  // so we never report a line that doesn't exist in the source.
  const interpolated = entry.origStart + (obfuscatedLineNumber - entry.obfStart);
  if (interpolated < entry.origStart) return entry.origStart;
  if (interpolated > entry.origEnd) return entry.origEnd;
  return interpolated;
}

/**
 * Drop the outermost frame if it was added by the compiler. Only the
 * outermost is removed — taking out more would wrongly prune chains
 * where two outer frames in a row happen to be compiler-added.
 */
function stripOutermostSynthesizedFrame(frames: ResolvedFrame[]): ResolvedFrame[] {
  if (frames.length === 0) {
    return frames;
  }
  const outermost = frames[frames.length - 1]!;
  if (outermost.entry && isSynthesizedFrame(outermost.entry)) {
    return frames.slice(0, -1);
  }
  return frames;
}

function isSynthesizedFrame(entry: MappingEntry): boolean {
  return (
    hasExtra(entry, SYNTHESIZED_ID) || entry.originalCall.call.includes('$$ExternalSynthetic')
  );
}

function applyRewriteFrame(
  frames: ResolvedFrame[],
  exceptionType: string | undefined
): ResolvedFrame[] {
  const outermost = frames[frames.length - 1]?.entry;
  if (!outermost || !exceptionType) {
    return frames;
  }

  let rewrittenFrames = [...frames];
  const extras = outermost.extras;
  for (let i = 0; i < extras.length; i++) {
    const extra = extras[i]!;
    if (extra.id !== REWRITE_FRAME_ID) {
      continue;
    }
    if (!rewriteConditionsMatch(extra.conditions ?? [], exceptionType)) {
      continue;
    }
    const actions = extra.actions ?? [];
    for (let a = 0; a < actions.length; a++) {
      const match = actions[a]!.match(REMOVE_INNER_FRAMES_RE);
      if (match) {
        const count = Number.parseInt(match[1]!, 10);
        rewrittenFrames = rewrittenFrames.slice(Math.min(count, rewrittenFrames.length));
      }
    }
  }
  return rewrittenFrames;
}

/**
 * Checks the `conditions` array of a `rewriteFrame` extras object.
 *
 * Unknown conditions don't match. New condition kinds may be added
 * to the mapping format later (today only `throws(...)` is defined),
 * and silently matching one would apply the action when it shouldn't.
 * Treating unknowns as not-matching skips the action — the safer
 * choice.
 */
function rewriteConditionsMatch(conditions: string[], exceptionType: string): boolean {
  return conditions.every((condition) => {
    const throwsMatch = condition.match(THROWS_CONDITION_RE);
    if (throwsMatch) {
      return throwsMatch[1] === exceptionType;
    }
    return false;
  });
}

function hasExtra(entry: MappingEntry, id: string): boolean {
  const extras = entry.extras;
  for (let i = 0; i < extras.length; i++) {
    if (extras[i]!.id === id) {
      return true;
    }
  }
  return false;
}

function formatResolvedFrame(
  indent: string,
  frame: ResolvedFrame,
  keepSourceInfo?: string
): string {
  if (keepSourceInfo !== undefined) {
    return `${indent}at ${frame.call.call}(${keepSourceInfo})`;
  }
  return `${indent}at ${formatCall(frame.call, frame.lineNumber)}`;
}

function formatUnmappedFrame(
  frame: ParsedFrame,
  document: ClassDocument | undefined
): string {
  if (!document) {
    return frame.originalLine;
  }
  const sourceFile =
    document.sourceFile ??
    inferSourceFile(document.originalClass, `${document.originalClass}.${frame.methodName}`);
  const sourceInfo =
    frame.lineNumber === undefined
      ? frame.sourceInfo
      : `${sourceFile}:${frame.lineNumber}`;
  return `${frame.indent}at ${document.originalClass}.${frame.methodName}(${sourceInfo})`;
}

function formatCall(call: OriginalCall, lineNumber?: number): string {
  if (!call.sourceFile) {
    return call.call;
  }
  if (lineNumber === undefined) {
    return `${call.call}(${call.sourceFile})`;
  }
  return `${call.call}(${call.sourceFile}:${lineNumber})`;
}

function inferSourceFile(className: string, call: string): string {
  const dollar = className.indexOf('$');
  const outerClass = dollar === -1 ? className : className.slice(0, dollar);
  const simpleName = outerClass.slice(outerClass.lastIndexOf('.') + 1);
  if (simpleName.endsWith('Kt')) {
    return `${simpleName.slice(0, -2)}.kt`;
  }
  if (dollar !== -1 || call.includes('$')) {
    return `${simpleName}.kt`;
  }
  return `${simpleName}.java`;
}
