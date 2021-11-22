/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// import { FormattedMessage } from '@kbn/i18n/react';
import React, { FC, useEffect, useState } from 'react';

import {
  EuiSpacer,
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiToolTip,
  EuiHorizontalRule,
} from '@elastic/eui';
import { FieldIcon } from '@kbn/react-field/field_icon';
import { FindFileStructureResponse, InputOverrides } from '../../../../../../file_upload/common';
import { getSupportedFieldType } from '../../../common/components/fields_stats_grid/get_field_names';
import { splitGrok2, getGrokField } from '../../../common/util/grok_pattern';
import { MultiRegExp2 } from './multiRegExp2';
import { EditFieldModal } from './edit_field';

interface Props {
  data: string;
  results: FindFileStructureResponse;
  setOverrides: (overrides: InputOverrides) => void;
  overrides: InputOverrides;
  originalSettings: InputOverrides;
  analyzeFile(
    data: string,
    overrides: InputOverrides
  ): Promise<{ results: FindFileStructureResponse }>;
}

interface SpecialWord {
  start: number;
  end: number;
  length: number;
  name: string;
  type: string;
  value: string;
  knownField: boolean;
}

const WORD = `\b\w+\b`;
const NOTSPACE = `\S+`;
const DATA = `.*?`;
const INT = `(?:[+-]?(?:[0-9]+))`;
// (?:(?<![0-9.+-])(?=([+-]?(?:(?:[0-9]+(?:\.[0-9]+)?)|(?:\.[0-9]+))))\1)
const BASE10NUM = `(?<![0-9.+-])(?=([+-]?(?:(?:[0-9]+(?:\.[0-9]+)?)|(?:\.[0-9]+))))\\1`;
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
const HTTPDATE = `${MONTHDAY}/${MONTH}/${YEAR}:${TIME} ${INT}`;
const ISO8601_TIMEZONE = `(?:Z|[+-]${HOUR}(?::?${MINUTE}))`;
const TIMESTAMP_ISO8601 = `${YEAR}-${MONTHNUM}-${MONTHDAY}[T ]${HOUR}:?${MINUTE}(?::?${SECOND})?${ISO8601_TIMEZONE}?`;

const QUOTEDSTRING = `".*?"`;
const QS = QUOTEDSTRING;

const IPV6 = `((([0-9A-Fa-f]{1,4}:){7}([0-9A-Fa-f]{1,4}|:))|(([0-9A-Fa-f]{1,4}:){6}(:[0-9A-Fa-f]{1,4}|((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9A-Fa-f]{1,4}:){5}(((:[0-9A-Fa-f]{1,4}){1,2})|:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9A-Fa-f]{1,4}:){4}(((:[0-9A-Fa-f]{1,4}){1,3})|((:[0-9A-Fa-f]{1,4})?:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){3}(((:[0-9A-Fa-f]{1,4}){1,4})|((:[0-9A-Fa-f]{1,4}){0,2}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){2}(((:[0-9A-Fa-f]{1,4}){1,5})|((:[0-9A-Fa-f]{1,4}){0,3}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){1}(((:[0-9A-Fa-f]{1,4}){1,6})|((:[0-9A-Fa-f]{1,4}){0,4}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(:(((:[0-9A-Fa-f]{1,4}){1,7})|((:[0-9A-Fa-f]{1,4}){0,5}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:)))($.+)?`;
const IPV4 = `(?<![0-9])(?:(?:[0-1]?[0-9]{1,2}|2[0-4][0-9]|25[0-5])[.](?:[0-1]?[0-9]{1,2}|2[0-4][0-9]|25[0-5])[.](?:[0-1]?[0-9]{1,2}|2[0-4][0-9]|25[0-5])[.](?:[0-1]?[0-9]{1,2}|2[0-4][0-9]|25[0-5]))(?![0-9])`;
const IP = `(?:${IPV6}|${IPV4})`;

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

const NUMBER_OF_LINES = 10;

export const AnalysisMarkup: FC<Props> = ({
  results,
  data,
  setOverrides,
  overrides,
  originalSettings,
  analyzeFile,
}) => {
  const [markedUpLines, setMarkedUpLines] = useState<JSX.Element[][]>([]);
  const [showEditFieldModal, setShowEditFieldModal] = useState(false);
  const [editFieldCache, setEditFieldCache] = useState<any>(null);

  useEffect(() => {
    const lines: JSX.Element[][] = [];
    for (let i = 1; i <= NUMBER_OF_LINES; i++) {
      const line = processLine(i, results, data, editField);
      if (line !== undefined) {
        lines.push(line);
      }
    }
    if (lines.length) {
      setMarkedUpLines(lines);
    }
  }, [results, data]);

  function editField(
    value: string,
    index: number,
    indexOfSpecialWord: number,
    specialWords: string[],
    grokComponents2: string[]
  ) {
    const grokComponents = [...grokComponents2];
    setShowEditFieldModal(true);
    setEditFieldCache({ grokComponents, indexOfSpecialWord });
  }

  function editField2(fieldName: string | null) {
    if (editFieldCache !== null && fieldName !== null) {
      const { grokComponents, indexOfSpecialWord } = editFieldCache;
      grokComponents.reverse();
      grokComponents[indexOfSpecialWord] = `%{DATA:${fieldName}}`;
      grokComponents.reverse();
      const grokPattern = grokComponents.join('');
      // eslint-disable-next-line no-console
      console.log(grokPattern);
      setOverrides({ ...overrides, grokPattern });
    }

    setShowEditFieldModal(false);
  }

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

      {showEditFieldModal && (
        <EditFieldModal
          onClose={editField2}
          overrides={overrides}
          data={data}
          originalSettings={originalSettings}
          analyzeFile={analyzeFile}
          editFieldCache={editFieldCache}
        />
      )}

      <EuiSpacer size="m" />
      <div>First {NUMBER_OF_LINES} lines</div>
      <EuiSpacer size="m" />

      <div style={{ lineHeight: '24px', fontSize: '12px', backgroundColor: '#f5f7fa' }}>
        <code>
          {markedUpLines.map((line, i) => {
            return (
              <div>
                <EuiFlexGroup gutterSize="none">
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
                </EuiFlexGroup>
              </div>
            );
          })}
        </code>
      </div>
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
  editField: (
    value: string,
    index: number,
    indexOfSpecialWord: number,
    specialWords: any[],
    grokComponents: string[]
  ) => void
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
  const getEntityTypeFromName = getEntityTypeFromNameProvider(results);

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
      specialWordTypes.push({ name, type: getEntityTypeFromName(name), knownField: true });
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
  console.log(specialWords);
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
    const beginning = firstLineCopy.slice(0, start);
    const end = firstLineCopy.slice(start + length, line.length);
    firstLineCopy = beginning;
    lineSplit.push(<span>{end}</span>);
    if (knownField) {
      lineSplit.push(
        <EuiToolTip
          position="top"
          content={
            <div>
              <div>{name}</div>
              <EuiHorizontalRule margin="none" />
              <div style={{ fontSize: '12px', marginTop: '2px' }}>Type: {type}</div>
            </div>
          }
        >
          <EuiBadge
            color="warning"
            style={{
              marginRight: '2px',
              marginTop: '-2px',
              border: '1px solid #a89752',
              fontSize: '12px',
              padding: '0px 6px',
            }}
          >
            <EuiFlexGroup gutterSize="none">
              <EuiFlexItem grow={false}>
                <FieldIcon
                  type={type}
                  style={{ marginRight: '2px', marginTop: '1px', border: '1px solid #a89752' }}
                />
              </EuiFlexItem>
              <EuiFlexItem>{value}</EuiFlexItem>
            </EuiFlexGroup>
          </EuiBadge>
        </EuiToolTip>
      );
    } else {
      lineSplit.push(
        // <EuiLink
        //   color="text"
        //   style={{ fontWeight: '400' }}
        //   onClick={() => {
        //     editField(value, i);
        //   }}
        // >
        //   {value}
        // </EuiLink>

        // eslint-disable-next-line
        <span
          style={{ cursor: 'pointer' }}
          onClick={() => {
            editField(value, i, [...indicesOfSpecialWords][i], specialWords, grokComponents);
          }}
        >
          {value}
        </span>
      );
    }
    // firstLineCopy = beginning + <EuiBadge> + word + </EuiBadge> + end;
    // firstLineCopy = beginning + word + end;
  });
  lineSplit.push(<span>{firstLineCopy}</span>);
  lineSplit.reverse();
  // const gg = line.replace(reg, replacer);

  // setMarkedUpLines(lineSplit);
  return lineSplit;
}

function getEntityTypeFromNameProvider(results: FindFileStructureResponse) {
  return function getEntityTypeFromName(name: string) {
    const realName = name === 'timestamp' ? '@timestamp' : name;
    return getSupportedFieldType(results.mappings.properties[realName]?.type);
  };
}
