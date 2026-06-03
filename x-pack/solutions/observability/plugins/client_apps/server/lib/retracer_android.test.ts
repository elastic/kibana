/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AndroidClassMap } from './retracer_android';
import { RetracerAndroid } from './retracer_android';
import type { Logger } from './retracer';
import { androidMapFixtures } from './__fixtures__/android_maps';

async function retraceWith(
  stacktrace: string,
  maps: AndroidClassMap[],
  logger?: Logger
): Promise<string | undefined> {
  const retracer = new RetracerAndroid(
    stacktrace,
    {
      fetch: (sources) =>
        Promise.resolve(maps.filter((map) => sources.includes(map.obfuscated_class))),
    },
    { logger }
  );
  return retracer.retrace();
}

function recordingLogger(): { logger: Logger; warnings: string[] } {
  const warnings: string[] = [];
  return { logger: { warn: (msg) => warnings.push(msg) }, warnings };
}

describe('RetracerAndroid', () => {
  describe('fixture scenarios', () => {
    it.each(androidMapFixtures)('$name', async ({ expected, classMaps, stacktrace }) => {
      const maps = classMaps.map((s) => JSON.parse(s.content) as AndroidClassMap);
      const retracer = new RetracerAndroid(stacktrace, {
        fetch: (sources) =>
          Promise.resolve(maps.filter((map) => sources.includes(map.obfuscated_class))),
      });
      const result = await retracer.retrace();
      expect(result).toBe(expected);
    });
  });

  describe('outline handling', () => {
    it('callsite falls back to identity when carry position is missing from positions', async () => {
      const outliner: AndroidClassMap = {
        schema_version: 1,
        obfuscated_class: 's2',
        original_class: 'com.example.Outliner',
        source_file: 'Outliner.kt',
        methods: {
          a: {
            mappings: [
              {
                obf_range: [1, 1],
                orig_range: [0, 0],
                method: 'outlinedBody',
                extras: [{ id: 'com.android.tools.r8.outline' }],
              },
            ],
          },
        },
      };
      const caller: AndroidClassMap = {
        schema_version: 1,
        obfuscated_class: 's3',
        original_class: 'com.example.Caller',
        source_file: 'Caller.kt',
        methods: {
          a: {
            mappings: [
              {
                obf_range: [27, 27],
                orig_range: [50, 50],
                method: 'caller',
                extras: [
                  {
                    id: 'com.android.tools.r8.outlineCallsite',
                    positions: { '2': 99 },
                    outline: 'Ls2;a()V',
                  },
                ],
              },
              {
                obf_range: [1, 1],
                orig_range: [42, 42],
                method: 'caller',
              },
            ],
          },
        },
      };

      const stacktrace = [
        'java.lang.RuntimeException: outline-miss',
        '\tat s2.a(SourceFile:1)',
        '\tat s3.a(SourceFile:27)',
      ].join('\n');

      const result = await retraceWith(stacktrace, [outliner, caller]);

      expect(result).toBe(
        [
          'java.lang.RuntimeException: outline-miss',
          '\tat com.example.Caller.caller(Caller.kt:42)',
        ].join('\n')
      );
    });
  });

  describe('synthesized frames', () => {
    it('only the outermost synthesized frame is stripped from an inline chain', async () => {
      const map: AndroidClassMap = {
        schema_version: 1,
        obfuscated_class: 'a',
        original_class: 'com.example.Foo',
        source_file: 'Foo.kt',
        methods: {
          m: {
            mappings: [
              { obf_range: [5, 5], orig_range: [10, 10], method: 'real' },
              {
                obf_range: [5, 5],
                orig_range: [20, 20],
                method: 'synth1',
                extras: [{ id: 'com.android.tools.r8.synthesized' }],
              },
              {
                obf_range: [5, 5],
                orig_range: [30, 30],
                method: 'synth2',
                extras: [{ id: 'com.android.tools.r8.synthesized' }],
              },
            ],
          },
        },
      };
      const stacktrace = ['java.lang.RuntimeException: synth-chain', '\tat a.m(SourceFile:5)'].join(
        '\n'
      );

      const result = await retraceWith(stacktrace, [map]);

      expect(result).toBe(
        [
          'java.lang.RuntimeException: synth-chain',
          '\tat com.example.Foo.real(Foo.kt:10)',
          '\tat com.example.Foo.synth1(Foo.kt:20)',
        ].join('\n')
      );
    });
  });

  describe('map_version handling', () => {
    it('documents with a newer map_version are retraced best-effort with a warning', async () => {
      const map: AndroidClassMap = {
        schema_version: 1,
        map_version: '9.9',
        obfuscated_class: 'a',
        original_class: 'com.example.Foo',
        source_file: 'Foo.kt',
        methods: {
          m: {
            mappings: [{ obf_range: [1, 1], orig_range: [42, 42], method: 'foo' }],
          },
        },
      };
      const stacktrace = '\tat a.m(SourceFile:1)';

      const { logger, warnings } = recordingLogger();
      const result = await retraceWith(stacktrace, [map], logger);

      expect(result).toBe('\tat com.example.Foo.foo(Foo.kt:42)');
      expect(warnings).toHaveLength(1);
      expect(warnings[0]).toMatch(/\[stack-reframe\] R8 map_version mismatch/);
      expect(warnings[0]).toMatch(/9\.9/);
      expect(warnings[0]).toMatch(/MAX_KNOWN_MAP_VERSION \(2\.2\)/);
    });

    it('the warning is emitted once per retrace, listing every distinct unknown version', async () => {
      const docA: AndroidClassMap = {
        schema_version: 1,
        map_version: '9.9',
        obfuscated_class: 'a',
        original_class: 'com.example.Foo',
        source_file: 'Foo.kt',
        methods: {
          m: { mappings: [{ obf_range: [1, 1], orig_range: [42, 42], method: 'foo' }] },
        },
      };
      const docB: AndroidClassMap = {
        schema_version: 1,
        map_version: '10.0',
        obfuscated_class: 'b',
        original_class: 'com.example.Bar',
        source_file: 'Bar.kt',
        methods: {
          m: { mappings: [{ obf_range: [1, 1], orig_range: [99, 99], method: 'bar' }] },
        },
      };
      const stacktrace = ['\tat a.m(SourceFile:1)', '\tat b.m(SourceFile:1)'].join('\n');

      const { logger, warnings } = recordingLogger();
      await retraceWith(stacktrace, [docA, docB], logger);

      expect(warnings).toHaveLength(1);
      expect(warnings[0]).toMatch(/2 document\(s\)/);
      expect(warnings[0]).toMatch(/9\.9, 10\.0/);
    });

    it('documents whose map_version equals the retracer max are accepted with no warning', async () => {
      const map: AndroidClassMap = {
        schema_version: 1,
        map_version: '2.2',
        obfuscated_class: 'a',
        original_class: 'com.example.Foo',
        source_file: 'Foo.kt',
        methods: {
          m: { mappings: [{ obf_range: [1, 1], orig_range: [42, 42], method: 'foo' }] },
        },
      };
      const { logger, warnings } = recordingLogger();
      const result = await retraceWith('\tat a.m(SourceFile:1)', [map], logger);

      expect(result).toBe('\tat com.example.Foo.foo(Foo.kt:42)');
      expect(warnings).toEqual([]);
    });

    it('documents without map_version are accepted with no warning (legacy R8)', async () => {
      const map: AndroidClassMap = {
        schema_version: 1,
        obfuscated_class: 'a',
        original_class: 'com.example.Foo',
        source_file: 'Foo.kt',
        methods: {
          m: { mappings: [{ obf_range: [1, 1], orig_range: [42, 42], method: 'foo' }] },
        },
      };
      const { logger, warnings } = recordingLogger();
      const result = await retraceWith('\tat a.m(SourceFile:1)', [map], logger);

      expect(result).toBe('\tat com.example.Foo.foo(Foo.kt:42)');
      expect(warnings).toEqual([]);
    });

    it('documents with a malformed map_version are retraced best-effort with a warning', async () => {
      const map: AndroidClassMap = {
        schema_version: 1,
        map_version: 'experimental-build',
        obfuscated_class: 'a',
        original_class: 'com.example.Foo',
        source_file: 'Foo.kt',
        methods: {
          m: { mappings: [{ obf_range: [1, 1], orig_range: [42, 42], method: 'foo' }] },
        },
      };
      const { logger, warnings } = recordingLogger();
      const result = await retraceWith('\tat a.m(SourceFile:1)', [map], logger);

      expect(result).toBe('\tat com.example.Foo.foo(Foo.kt:42)');
      expect(warnings).toHaveLength(1);
      expect(warnings[0]).toMatch(/experimental-build/);
    });
  });

  describe('rewriteFrame', () => {
    it('is fail-closed for unknown condition kinds', async () => {
      const map: AndroidClassMap = {
        schema_version: 1,
        obfuscated_class: 'a',
        original_class: 'com.example.Foo',
        source_file: 'Foo.kt',
        methods: {
          m: {
            mappings: [
              { obf_range: [1, 1], orig_range: [10, 10], method: 'inner' },
              {
                obf_range: [1, 1],
                orig_range: [20, 20],
                method: 'outer',
                extras: [
                  {
                    id: 'com.android.tools.r8.rewriteFrame',
                    conditions: [
                      'throws(Ljava/lang/NullPointerException;)',
                      'instanceOf(Lcom/example/Marker;)',
                    ],
                    actions: ['removeInnerFrames(1)'],
                  },
                ],
              },
            ],
          },
        },
      };
      const stacktrace = ['java.lang.NullPointerException: x', '\tat a.m(SourceFile:1)'].join('\n');

      const result = await retraceWith(stacktrace, [map]);

      expect(result).toBe(
        [
          'java.lang.NullPointerException: x',
          '\tat com.example.Foo.inner(Foo.kt:10)',
          '\tat com.example.Foo.outer(Foo.kt:20)',
        ].join('\n')
      );
    });

    it('still applies when only known conditions match', async () => {
      const map: AndroidClassMap = {
        schema_version: 1,
        obfuscated_class: 'a',
        original_class: 'com.example.Foo',
        source_file: 'Foo.kt',
        methods: {
          m: {
            mappings: [
              { obf_range: [1, 1], orig_range: [10, 10], method: 'inner' },
              {
                obf_range: [1, 1],
                orig_range: [20, 20],
                method: 'outer',
                extras: [
                  {
                    id: 'com.android.tools.r8.rewriteFrame',
                    conditions: ['throws(Ljava/lang/NullPointerException;)'],
                    actions: ['removeInnerFrames(1)'],
                  },
                ],
              },
            ],
          },
        },
      };
      const stacktrace = ['java.lang.NullPointerException: x', '\tat a.m(SourceFile:1)'].join('\n');

      const result = await retraceWith(stacktrace, [map]);

      expect(result).toBe(
        ['java.lang.NullPointerException: x', '\tat com.example.Foo.outer(Foo.kt:20)'].join('\n')
      );
    });
  });

  it('a corrupt extras object falls back to the original frame; the rest of the trace keeps retracing', async () => {
    const map: AndroidClassMap = {
      schema_version: 1,
      obfuscated_class: 'a',
      original_class: 'com.example.Foo',
      source_file: 'Foo.kt',
      methods: {
        m: {
          mappings: [
            {
              obf_range: [1, 1],
              orig_range: [10, 10],
              method: 'first',
              extras: new Proxy([{}] as any, {
                get() {
                  throw new Error('boom');
                },
              }) as any,
            },
          ],
        },
        n: {
          mappings: [{ obf_range: [2, 2], orig_range: [20, 20], method: 'second' }],
        },
      },
    };
    const stacktrace = [
      'java.lang.RuntimeException: x',
      '\tat a.m(SourceFile:1)',
      '\tat a.n(SourceFile:2)',
    ].join('\n');

    const result = await retraceWith(stacktrace, [map]);

    expect(result).toBe(
      [
        'java.lang.RuntimeException: x',
        '\tat a.m(SourceFile:1)',
        '\tat com.example.Foo.second(Foo.kt:20)',
      ].join('\n')
    );
  });

  describe('line number interpolation', () => {
    it('is clamped to orig_range when spans differ', async () => {
      const map: AndroidClassMap = {
        schema_version: 1,
        obfuscated_class: 'a',
        original_class: 'com.example.Foo',
        source_file: 'Foo.kt',
        methods: {
          m: {
            mappings: [{ obf_range: [1, 10], orig_range: [100, 105], method: 'foo' }],
          },
        },
      };

      const result = await retraceWith('\tat a.m(SourceFile:8)', [map]);
      expect(result).toBe('\tat com.example.Foo.foo(Foo.kt:105)');
    });
  });

  describe('source file handling', () => {
    it('Native Method source-file is preserved when class is in the mapping', async () => {
      const map: AndroidClassMap = {
        schema_version: 1,
        obfuscated_class: 'l8',
        original_class: 'com.example.NativeHolder',
        source_file: 'NativeHolder.kt',
        methods: {
          a: {
            mappings: [{ obf_range: [1, 1], orig_range: [10, 10], method: 'nativePollOnce' }],
          },
        },
      };

      const result = await retraceWith('\tat l8.a(Native Method)', [map]);
      expect(result).toBe('\tat com.example.NativeHolder.nativePollOnce(Native Method)');
    });

    it('source-file is inferred as .kt when document has none and class ends with Kt', async () => {
      const map: AndroidClassMap = {
        schema_version: 1,
        obfuscated_class: 'a',
        original_class: 'com.example.FooKt',
        methods: {
          m: {
            mappings: [{ obf_range: [1, 1], orig_range: [42, 42], method: 'greet' }],
          },
        },
      };

      const result = await retraceWith('\tat a.m(SourceFile:1)', [map]);
      expect(result).toBe('\tat com.example.FooKt.greet(Foo.kt:42)');
    });

    it('source-file is inferred as .java when document has none and class is non-Kt', async () => {
      const map: AndroidClassMap = {
        schema_version: 1,
        obfuscated_class: 'a',
        original_class: 'com.example.Foo',
        methods: {
          m: {
            mappings: [{ obf_range: [1, 1], orig_range: [42, 42], method: 'greet' }],
          },
        },
      };

      const result = await retraceWith('\tat a.m(SourceFile:1)', [map]);
      expect(result).toBe('\tat com.example.Foo.greet(Foo.java:42)');
    });

    it('cross-class entry without source_file override infers from the inlinee class', async () => {
      const map: AndroidClassMap = {
        schema_version: 1,
        obfuscated_class: 'a',
        original_class: 'com.example.Caller',
        source_file: 'Caller.kt',
        methods: {
          m: {
            mappings: [
              {
                obf_range: [1, 1],
                orig_range: [42, 42],
                method: 'first',
                class: 'kotlin.collections.ArraysKt',
              },
            ],
          },
        },
      };

      const result = await retraceWith('\tat a.m(SourceFile:1)', [map]);
      expect(result).toBe('\tat kotlin.collections.ArraysKt.first(Arrays.kt:42)');
    });
  });

  describe('inline frame expansion', () => {
    it('two entries at the same obfuscated line expand to two output frames (innermost-first)', async () => {
      const map: AndroidClassMap = {
        schema_version: 1,
        obfuscated_class: 'a',
        original_class: 'com.example.Foo',
        source_file: 'Foo.kt',
        methods: {
          m: {
            mappings: [
              { obf_range: [5, 5], orig_range: [12, 12], method: 'helper' },
              { obf_range: [5, 5], orig_range: [20, 20], method: 'caller' },
            ],
          },
        },
      };
      const stacktrace = ['java.lang.RuntimeException: x', '\tat a.m(SourceFile:5)'].join('\n');

      const result = await retraceWith(stacktrace, [map]);

      expect(result).toBe(
        [
          'java.lang.RuntimeException: x',
          '\tat com.example.Foo.helper(Foo.kt:12)',
          '\tat com.example.Foo.caller(Foo.kt:20)',
        ].join('\n')
      );
    });

    it('composes with cross-class inlining', async () => {
      const map: AndroidClassMap = {
        schema_version: 1,
        obfuscated_class: 'a',
        original_class: 'com.example.Caller',
        source_file: 'Caller.kt',
        methods: {
          m: {
            mappings: [
              {
                obf_range: [5, 5],
                orig_range: [12, 12],
                method: 'helper',
                class: 'com.example.Inlinee',
                source_file: 'Inlinee.kt',
              },
              { obf_range: [5, 5], orig_range: [20, 20], method: 'caller' },
            ],
          },
        },
      };
      const stacktrace = ['java.lang.RuntimeException: x', '\tat a.m(SourceFile:5)'].join('\n');

      const result = await retraceWith(stacktrace, [map]);

      expect(result).toBe(
        [
          'java.lang.RuntimeException: x',
          '\tat com.example.Inlinee.helper(Inlinee.kt:12)',
          '\tat com.example.Caller.caller(Caller.kt:20)',
        ].join('\n')
      );
    });
  });
});
