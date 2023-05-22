/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// import { FormattedMessage } from '@kbn/i18n-react';
import React, { FC, useEffect, useState, useCallback, useMemo } from 'react';

// import {
//   // EuiSpacer,
//   // EuiBadge,
//   EuiFlexGroup,
//   EuiFlexItem,
//   // EuiToolTip,
//   // EuiHorizontalRule,
//   EuiButtonEmpty,
//   EuiPopover,
//   EuiPopoverTitle,
//   EuiButtonIcon,
//   EuiFieldText,
//   EuiForm,
//   EuiFormRow,
// } from '@elastic/eui';
import { FindFileStructureResponse } from '@kbn/file-upload-plugin/common';
// import { FieldIcon } from '@kbn/react-field';
import {
  EuiButton,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { cloneDeep } from 'lodash';
import { grokTypeToFieldType } from './get_field_names';
import {
  splitGrok2,
  getGrokField,
  replaceFieldInGrokPatternByName,
  removeFieldInGrokPattern,
} from './grok_pattern';
import { MultiRegExp2 } from './multi_reg_exp';
// import { FieldBadge } from './field_badge';
import { FieldPopover } from './field_popover';
import { Field } from '../fields_table';
import { FieldBadge } from './field_badge';
// import { EditFieldModal } from './edit_field';

interface SpecialWord {
  start: number;
  end: number;
  length: number;
  name: string;
  type: string;
  value: string;
  knownField: boolean;
}

// const WORD = `\b\w+\b`;
// const NOTSPACE = `\S+`;
const DATA = `.*?`;
const GREEDYDATA = `.*`;
const INT = `(?:[+-]?(?:[0-9]+))`;
// (?:(?<![0-9.+-])(?=([+-]?(?:(?:[0-9]+(?:\.[0-9]+)?)|(?:\.[0-9]+))))\1)
// const BASE10NUM = `(?<![0-9.+-])(?=([+-]?(?:(?:[0-9]+(?:\.[0-9]+)?)|(?:\.[0-9]+))))\\1`;
// const NUMBER = `(?:${BASE10NUM})`;
// const NUMBER = '((?:(?<![0-9.+-])(?=([+-]?(?:(?:[0-9]+(?:\\.[0-9]+)?)|(?:\\.[0-9]+))))\\1))';
const NUMBER = '\\d+.?\\d*';

const MONTH =
  '\\b(?:Jan(?:uary|uar)?|Feb(?:ruary|ruar)?|M(?:a|ä)?r(?:ch|z)?|Apr(?:il)?|Ma(?:y|i)?|Jun(?:e|i)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|O(?:c|k)?t(?:ober)?|Nov(?:ember)?|De(?:c|z)(?:ember)?)\\b';
const MONTHDAY = '(?:(?:0[1-9])|(?:[12][0-9])|(?:3[01])|[1-9])';
const MONTHNUM = `(?:0?[1-9]|1[0-2])`;

// const YEAR = `(.*?)`; // `(?>\\d\\d){1,2}`;
const YEAR = `\\d\\d\\d?\\d?`;
const HOUR = `(?:2[0123]|[01]?[0-9])`;
const MINUTE = `(?:[0-5][0-9])`;
// # '60' is a leap second in most time standards and thus is valid.
const SECOND = `(?:(?:[0-5]?[0-9]|60)(?:[:.,][0-9]+)?)`;
const TIME = `(?!<[0-9])${HOUR}:${MINUTE}(?::${SECOND})(?![0-9])`;
const SYSLOGTIMESTAMP = `${MONTH} +${MONTHDAY} ${TIME}`;
// const HTTPDATE = `${MONTHDAY}/${MONTH}/${YEAR}:${TIME} ${INT}`;
const ISO8601_TIMEZONE = `(?:Z|[+-]${HOUR}(?::?${MINUTE}))`;
const TIMESTAMP_ISO8601 = `${YEAR}-${MONTHNUM}-${MONTHDAY}[T ]${HOUR}:?${MINUTE}(?::?${SECOND})?${ISO8601_TIMEZONE}?`;

const QUOTEDSTRING = `".*?"`;
const QS = QUOTEDSTRING;

// const IPV6 = `((([0-9A-Fa-f]{1,4}:){7}([0-9A-Fa-f]{1,4}|:))|(([0-9A-Fa-f]{1,4}:){6}(:[0-9A-Fa-f]{1,4}|((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9A-Fa-f]{1,4}:){5}(((:[0-9A-Fa-f]{1,4}){1,2})|:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9A-Fa-f]{1,4}:){4}(((:[0-9A-Fa-f]{1,4}){1,3})|((:[0-9A-Fa-f]{1,4})?:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){3}(((:[0-9A-Fa-f]{1,4}){1,4})|((:[0-9A-Fa-f]{1,4}){0,2}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){2}(((:[0-9A-Fa-f]{1,4}){1,5})|((:[0-9A-Fa-f]{1,4}){0,3}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){1}(((:[0-9A-Fa-f]{1,4}){1,6})|((:[0-9A-Fa-f]{1,4}){0,4}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(:(((:[0-9A-Fa-f]{1,4}){1,7})|((:[0-9A-Fa-f]{1,4}){0,5}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:)))($.+)?`;
// const IPV4 = `(?<![0-9])(?:(?:[0-1]?[0-9]{1,2}|2[0-4][0-9]|25[0-5])[.](?:[0-1]?[0-9]{1,2}|2[0-4][0-9]|25[0-5])[.](?:[0-1]?[0-9]{1,2}|2[0-4][0-9]|25[0-5])[.](?:[0-1]?[0-9]{1,2}|2[0-4][0-9]|25[0-5]))(?![0-9])`;
// const IP = `(?:${IPV6}|${IPV4})`;

// const HOSTNAME = `\b(?:[0-9A-Za-z][0-9A-Za-z-]{0,62})(?:\.(?:[0-9A-Za-z][0-9A-Za-z-]{0,62}))*(\.?|\b)`;
const HOSTNAME = `\b(?:[0-9A-Za-z][0-9A-Za-z-]{0,62})(?:\.(?:[0-9A-Za-z][0-9A-Za-z-]{0,62}))*`;
const IPORHOST = `.+?`; // `(?:${IP}|${HOSTNAME})`;

const USERNAME = `[a-zA-Z0-9._-]+`;
const USER = `${USERNAME}`;
const EMAILLOCALPART = `[a-zA-Z][a-zA-Z0-9_.+-=:]+`;
const EMAILADDRESS = `${EMAILLOCALPART}@${HOSTNAME}`;

// const HTTPDUSER = `${EMAILADDRESS}|${USER}`;
const HTTPDUSER = `${EMAILADDRESS}|${USER}`;

const LOGLEVEL = `[Aa]lert|ALERT|[Tt]race|TRACE|[Dd]ebug|DEBUG|[Nn]otice|NOTICE|[Ii]nfo|INFO|[Ww]arn?(?:ing)?|WARN?(?:ING)?|[Ee]rr?(?:or)?|ERR?(?:OR)?|[Cc]rit?(?:ical)?|CRIT?(?:ICAL)?|[Ff]atal|FATAL|[Ss]evere|SEVERE|EMERG(?:ENCY)?|[Ee]merg(?:ency)?`;

const COMBINEDAPACHELOG = `%{IPORHOST:clientip} %{HTTPDUSER:ident} %{USER:auth} \\[%{HTTPDATE:timestamp}\\] "(?:%{WORD:verb} %{NOTSPACE:request}(?: HTTP\\/%{NUMBER:httpversion})?|%{DATA:rawrequest})" %{NUMBER:response} (?:%{NUMBER:bytes}|-) %{QS:referrer} %{QS:agent}`;

// const COMBINEDAPACHELOG = `${QUOTEDSTRING}`;

const NUMBER_OF_LINES = 1;

interface Props {
  data: string;
  results: FindFileStructureResponse;
  setGrokPattern(grokPattern: string): Promise<void>;
  createRuntimeField(grokPattern: string): Promise<void>;
}

export const AnalysisMarkup: FC<Props> = ({
  results: resultsIn,
  data,
  setGrokPattern,
  createRuntimeField,
}) => {
  const [markedUpLines, setMarkedUpLines] = useState<JSX.Element[][]>([]);
  // const [showEditFieldModal, setShowEditFieldModal] = useState(false);
  // const [editFieldCache, setEditFieldCache] = useState<any>(null);
  const [isPopoverOpen, setIsPopoverOpen] = useState<number | null>(null);
  const [results2, setResults2] = useState(resultsIn);
  const [tempGrokPattern, setTempGrokPattern] = useState(results2.grok_pattern!);

  const originalGrokPattern = useMemo(() => resultsIn?.grok_pattern ?? '', [resultsIn]);

  useEffect(() => {
    setResults2(resultsIn);
  }, [resultsIn]);

  const updateField = useCallback(
    (field: Field) => {
      if (field.name !== field.originalName) {
        const newGrokPattern = replaceFieldInGrokPatternByName(
          results2.grok_pattern!,
          field.name,
          field.originalName
        );
        setResults2({ ...results2, grok_pattern: newGrokPattern });
        // eslint-disable-next-line no-console
        console.log('!!!', newGrokPattern);
      }

      if (field.enabled === false) {
        const newGrokPattern = removeFieldInGrokPattern(results2.grok_pattern!, field.name);
        setResults2({ ...results2, grok_pattern: newGrokPattern });
        // eslint-disable-next-line no-console
        console.log(newGrokPattern);
      }
    },
    [results2]
  );

  const addField = useCallback(
    (field: Field, indexOfSpecialWord: number, grokComponents: string[]) => {
      // debugger;
      grokComponents.reverse();
      grokComponents[indexOfSpecialWord] = `%{DATA:${field.name}}`;
      grokComponents.reverse();
      const newGrokPattern = grokComponents.join('');
      // console.log(grokPattern);
      setResults2({ ...results2, grok_pattern: newGrokPattern });
    },
    [results2]
  );

  useEffect(() => {
    setTempGrokPattern(results2.grok_pattern!.replace(/^%{POSINT:timestamp} /g, '^'));
  }, [results2]);

  const togglePopover = useCallback((index: number | null) => {
    setIsPopoverOpen(index);
  }, []);

  const update = useCallback(() => {
    setGrokPattern(results2.grok_pattern!);
  }, [results2.grok_pattern, setGrokPattern]);

  useEffect(() => {
    const lines: JSX.Element[][] = [];
    for (let i = 1; i <= NUMBER_OF_LINES; i++) {
      const line = processLine(
        i,
        results2,
        data,
        togglePopover,
        isPopoverOpen,
        updateField,
        addField
      );
      if (line !== undefined) {
        lines.push(line);
      }
    }
    if (lines.length) {
      setMarkedUpLines(lines);
    }
  }, [
    data,
    togglePopover,
    isPopoverOpen,
    updateField,
    results2,
    setGrokPattern,
    originalGrokPattern,
    addField,
  ]);

  // function editField(
  //   value: string,
  //   index: number,
  //   indexOfSpecialWord: number,
  //   specialWords: string[],
  //   grokComponents2: string[]
  // ) {
  //   const grokComponents = [...grokComponents2];
  //   setShowEditFieldModal(true);
  //   setEditFieldCache({ grokComponents, indexOfSpecialWord });
  // }

  // function editField2(fieldName: string | null) {
  //   if (editFieldCache !== null && fieldName !== null) {
  //     const { grokComponents, indexOfSpecialWord } = editFieldCache;
  //     grokComponents.reverse();
  //     grokComponents[indexOfSpecialWord] = `%{DATA:${fieldName}}`;
  //     grokComponents.reverse();
  //     const grokPattern = grokComponents.join('');
  //     // eslint-disable-next-line no-console
  //     console.log(grokPattern);
  //     setOverrides({ ...overrides, grokPattern });
  //   }

  //   setShowEditFieldModal(false);
  // }

  if (markedUpLines.length === 0) {
    return null;
  }

  return (
    <>
      {/* <EuiTitle size="s">
        <h2>
          <FormattedMessage
            id="xpack.dataVisualizer.file.analysisSummary.summaryTitle"
            defaultMessage="Analysis markup"
          />
        </h2>
      </EuiTitle> */}

      {/* {showEditFieldModal && (
        <></>
        // <EditFieldModal
        //   onClose={editField2}
        //   overrides={overrides}
        //   data={data}
        //   originalSettings={originalSettings}
        //   analyzeFile={analyzeFile}
        //   editFieldCache={editFieldCache}
        // />
      )} */}

      {/* <EuiSpacer size="m" />
      <div>First {NUMBER_OF_LINES} lines</div>
      <EuiSpacer size="m" /> */}

      <EuiSpacer size="s" />

      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiTitle size="xs">
            <h3>Message structure</h3>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            size="s"
            onClick={() => update()}
            disabled={originalGrokPattern! === results2.grok_pattern!}
          >
            Update
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="s" />

      <div style={{ lineHeight: '24px', fontSize: '12px', backgroundColor: '#f5f7fa' }}>
        <code>
          {markedUpLines.map((line, i) => {
            return (
              <div>
                {/* <EuiFlexGroup gutterSize="none">
                  <EuiFlexItem
                    grow={false}
                    style={{
                      minWidth: 49,
                      backgroundColor: '#FFF',
                      textAlign: 'right',
                      color: '#69707D',
                      borderLeft: '1px solid #e9edf3',
                    }}
                  >
                    <span style={{ marginRight: '13px' }}>{i + 1}</span>
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <div style={{ display: 'inline-block', marginLeft: '4px' }}>{line}</div>
                  </EuiFlexItem>
                </EuiFlexGroup> */}
                <div style={{ display: 'inline-block', marginLeft: '4px' }}>{line}</div>
              </div>
            );
          })}
        </code>
      </div>

      <EuiSpacer size="m" />

      <EuiTitle size="xxxs">
        <h6>Grok pattern</h6>
      </EuiTitle>
      <EuiCodeBlock language="regex" isCopyable>
        {tempGrokPattern}
      </EuiCodeBlock>

      <EuiTitle size="xxxs">
        <h6>Pipeline</h6>
      </EuiTitle>
      <EuiCodeBlock language="text" isCopyable>
        {JSON.stringify(processPipeline(results2.ingest_pipeline, results2.grok_pattern!), null, 2)}
      </EuiCodeBlock>

      <EuiSpacer size="m" />

      <EuiFlexGroup>
        <EuiFlexItem grow={false}>
          <EuiButton onClick={() => createRuntimeField(tempGrokPattern)}>
            Create runtime fields
          </EuiButton>
        </EuiFlexItem>
        <EuiFlexItem />
      </EuiFlexGroup>
    </>
  );
};

function getLine(lineNo: number, startPattern: string | undefined, data: string) {
  if (lineNo < 1) {
    return '';
  }

  const lines = data.split('\n');
  const collectedLines = [];

  if (startPattern === undefined) {
    return lines[lineNo - 1];
  }
  let lineCount = 1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.match(startPattern)) {
      if (collectedLines.length === 0) {
        collectedLines.push(lines[i]);
      } else {
        if (lineCount === lineNo) {
          break;
        } else {
          collectedLines.length = 0;
          collectedLines.push(lines[i]);
          lineCount++;
        }
      }
    } else {
      collectedLines.push(lines[i]);
    }
  }

  return collectedLines.join('');
}

function processLine(
  lineNo: number,
  results: FindFileStructureResponse,
  data: string,
  togglePopover: (index: number | null) => void,
  isPopoverOpen: number | null,
  updateField: (field: Field) => void,
  addField: (field: Field, indexOfSpecialWord: number, grokComponents: string[]) => void
) {
  let grok = results.grok_pattern;
  if (grok === undefined) {
    return;
  }
  const line = getLine(lineNo, results.multiline_start_pattern, data);

  if (grok === '%{COMBINEDAPACHELOG}') {
    grok = COMBINEDAPACHELOG;
  }
  // const grok1 = grok.replace(new RegExp('%{.+:.+}'), '__WW__');
  // const gg = grok.split(/(%{.+?:.+?})/);
  const grokComponents = splitGrok2(grok);
  // const hh = grok.replace(/%{.+?:.+?}/g, '(.*)');

  const indicesOfSpecialWords = new Set<number>();
  const specialWordTypes: Array<{ name: string; type: string; knownField: boolean }> = [];
  // const startOfSpecialWords: number[] = [];
  // const getEntityTypeFromName = getEntityTypeFromNameProvider(results);

  const replacedGrokComponents = grokComponents.map((d, i) => {
    const { name, type, valid } = getGrokField(d);
    if (valid) {
      // const match = d.match('%{(.+?):(.+?)}');
      // if (match === null) {
      //   return d;
      // }
      // const [, grokType, name] = match;
      // if (valid === false) {
      //   return d;
      // }
      specialWordTypes.push({ name, type: grokTypeToFieldType(type), knownField: true });
      indicesOfSpecialWords.add(i);

      switch (type) {
        case 'INT':
          return `(${INT})`;
        case 'SYSLOGTIMESTAMP':
          return `(${SYSLOGTIMESTAMP})`;
        case 'NUMBER':
          return `(${NUMBER})`;
        case 'IPORHOST':
          return `(${IPORHOST})`;
        case 'HTTPDUSER':
          return `(${HTTPDUSER})`;
        case 'USER':
          return `(${USER})`;
        case 'TIMESTAMP_ISO8601':
          return `(${TIMESTAMP_ISO8601})`;
        case 'LOGLEVEL':
          return `(${LOGLEVEL})`;
        case 'DATA':
          return `(${DATA})`;
        case 'GREEDYDATA':
          return `(${GREEDYDATA})`;
        // case 'HTTPDATE':
        //   return `(${HTTPDATE})`;
        // case 'WORD':
        //   return `(${WORD})`;
        // case 'NOTSPACE':
        //   return `(${NOTSPACE})`;
        case 'QS':
          return `(${QS})`;
        default:
          return '(.+?)';
      }
    }
    if (d === '.*?') {
      specialWordTypes.push({ name: '', type: '', knownField: false });
      indicesOfSpecialWords.add(i);
      return '(.*?)';
    }
    if (d === '.*') {
      specialWordTypes.push({ name: '', type: '', knownField: false });
      indicesOfSpecialWords.add(i);
      return '(.*)';
    }
    return d;
  });

  const newGrok = replacedGrokComponents.join('');
  // eslint-disable-next-line no-console
  console.log(newGrok);

  const q = new RegExp(newGrok);
  const a = q.exec(line);
  // eslint-disable-next-line no-console
  console.log(a);

  const regex = new MultiRegExp2(new RegExp(newGrok));
  const matches = regex.execForAllGroups(line);
  // console.log(matches);

  // const matches = line.match(ww);
  if (matches === null) {
    return;
  }
  // matches!.shift();
  const specialWords: SpecialWord[] = matches!.map(({ match, start, end }, i) => {
    const value = match ?? '';
    const specialWord = specialWordTypes[i];
    return {
      value,
      length: end - start,
      start,
      end,
      name: specialWord ? specialWord.name : '',
      type: specialWord ? specialWord.type : '',
      knownField: specialWord ? specialWord.knownField : false,
    };
  });

  // for (let i = jj.length - 1; i >= 0; i--) {
  //   if (indicesOfSpecialWords.has(i)) {
  //     // console.log(jj[i]);
  //     const ss = jj.slice(0, i).join('');
  //     const match = line.match(new RegExp(ss));
  //     // console.log(match);
  //     startOfSpecialWords.push(match![0].length);
  //   }
  // }

  // startOfSpecialWords.reverse().forEach((s, i) => {
  //   specialWords[i].start = s;
  // });

  // eslint-disable-next-line no-console
  console.log('specialWords', specialWords);
  // const reg = new RegExp(
  //   '<(.+)>(.+): .*?: (.+).*?: .*?: .*? .*? .*? .*?(.+)/(.+), .*? .*?(.+), .*?/(.+) .*?/(.+)/(.+).*'
  // );

  // function replacer(match: string, ...p: unknown[]) {
  //   let txt = '';
  //   for (let i = 0; i < p.length - 2; i++) {
  //     const agg = p[i];
  //     // txt += i % 2 ? agg : `<span class="highlight">${agg}</span>`;
  //     // txt += i % 2 ? agg : `$$`;
  //     txt += '$$';
  //   }
  //   return txt;
  // }

  let firstLineCopy = line;
  const lineSplit: JSX.Element[] = [];
  specialWords.reverse().forEach(({ value, start, length, type, name, knownField }, i) => {
    const field: Field = {
      name,
      type,
      originalName: name,
      enabled: true,
      hidden: false,
    };

    const beginning = firstLineCopy.slice(0, start);
    const end = firstLineCopy.slice(start + length, line.length);
    firstLineCopy = beginning;

    lineSplit.push(<span css={{ verticalAlign: 'middle' }}>{end}</span>);

    if (knownField) {
      if (i === specialWords.length - 1) {
        // skip the timestamp at the beginning
        return;
      }
      // console.log('knownField', field);

      lineSplit.push(
        <FieldPopover
          field={field}
          value={value}
          isPopoverOpen={isPopoverOpen}
          togglePopover={togglePopover}
          index={i}
          isNewField={false}
          updateField={updateField}
          results={results}
        >
          <FieldBadge type={field.type} value={value} />
        </FieldPopover>
      );
    } else {
      const addField2 = (f: Field) => {
        const indexOfSpecialWord = [...indicesOfSpecialWords][i];

        addField(f, indexOfSpecialWord, grokComponents);
      };
      lineSplit.push(
        <FieldPopover
          field={field}
          value={value}
          isPopoverOpen={isPopoverOpen}
          togglePopover={togglePopover}
          index={i}
          isNewField={true}
          updateField={updateField}
          addField={addField2}
          results={results}
        >
          <span
            css={{
              cursor: 'pointer',
              fontWeight: 'normal',
              fontSize: '12px',
              marginTop: '-5px',
              fontFamily: "'Roboto Mono',Menlo,Courier,monospace",
              color: '#343741',
            }}
          >
            {value}
          </span>
        </FieldPopover>
      );
    }
    // firstLineCopy = beginning + <EuiBadge> + word + </EuiBadge> + end;
    // firstLineCopy = beginning + word + end;
  });
  lineSplit.push(<span css={{ verticalAlign: 'middle' }}>{firstLineCopy}</span>);
  lineSplit.reverse();
  // const gg = line.replace(reg, replacer);

  // setMarkedUpLines(lineSplit);
  return lineSplit;
}

// function unescapeGrok(grokPattern: string) {
//   return grokPattern.replace(/\\/g, '');
// }

function processPipeline(
  pipeline: FindFileStructureResponse['ingest_pipeline'],
  grokPattern: string
) {
  const gg = cloneDeep(pipeline);
  if (gg.processors[0].grok?.patterns) {
    const gr = grokPattern.replace(/^%{POSINT:timestamp} /g, '^');
    gg.processors[0].grok.patterns = [gr];
  }
  gg.processors.splice(1, 1);
  gg.processors.splice(gg.processors.length - 1, 1);
  return gg;
}

// function getEntityTypeFromNameProvider(results: FindFileStructureResponse) {
//   return function getEntityTypeFromName(name: string, grokType: string) {
//     const realName = name === 'timestamp' ? '@timestamp' : name;
//     const type = getSupportedFieldType(results.mappings.properties[realName]?.type);

//     return type;
//   };
// }
