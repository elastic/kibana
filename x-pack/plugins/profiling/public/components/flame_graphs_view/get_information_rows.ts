/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { NOT_AVAILABLE_LABEL } from '../../../common';
import { describeFrameType } from '../../../common/profiling';

export function getInformationRows({
  fileID,
  frameType,
  exeFileName,
  addressOrLine,
  functionName,
  sourceFileName,
  sourceLine,
}: {
  fileID: string;
  frameType: number;
  exeFileName: string;
  addressOrLine: number;
  functionName: string;
  sourceFileName: string;
  sourceLine: number;
}) {
  const executable = fileID === '' && addressOrLine === 0 ? 'root' : exeFileName;
  const sourceLineNumber = sourceLine > 0 ? `#${sourceLine}` : '';

  const informationRows = [];

  if (executable) {
    informationRows.push({
      label: i18n.translate('xpack.profiling.flameGraphInformationWindow.executableLabel', {
        defaultMessage: 'Executable',
      }),
      value: executable,
    });
  } else {
    informationRows.push({
      label: i18n.translate('xpack.profiling.flameGraphInformationWindow.frameTypeLabel', {
        defaultMessage: 'Frame type',
      }),
      value: describeFrameType(frameType),
    });
  }

  informationRows.push({
    label: i18n.translate('xpack.profiling.flameGraphInformationWindow.functionLabel', {
      defaultMessage: 'Function',
    }),
    value: functionName || NOT_AVAILABLE_LABEL,
  });

  informationRows.push({
    label: i18n.translate('xpack.profiling.flameGraphInformationWindow.sourceFileLabel', {
      defaultMessage: 'Source file',
    }),
    value: sourceFileName ? `${sourceFileName}${sourceLineNumber}` : NOT_AVAILABLE_LABEL,
  });

  return informationRows;
}
