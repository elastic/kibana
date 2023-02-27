/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiCode } from '@elastic/eui';

import { MultiTextInputField } from './multi_text_input_field';

export interface UrlPatternsFieldProps {
  defaultValue: string[];
  onChange: (value: string[]) => void;
  onBlur?: () => void;
  'data-test-subj'?: string;
  readOnly?: boolean;
}

export const UrlPatternsField = ({
  defaultValue,
  onChange,
  onBlur,
  'data-test-subj': dataTestSubj,
  readOnly,
}: UrlPatternsFieldProps) => {
  return (
    <MultiTextInputField
      addPairControlLabel={
        <FormattedMessage
          id="xpack.synthetics.createPackagePolicy.stepConfigure.apm.addUrlPattern.label"
          defaultMessage="Add pattern"
        />
      }
      defaultValue={defaultValue}
      onChange={onChange}
      onBlur={() => onBlur?.()}
      data-test-subj={dataTestSubj}
      readOnly={readOnly}
    />
  );
};

export const urlPatternsFieldHelpText = (
  <FormattedMessage
    id="xpack.synthetics.monitorConfig.apmUrlPatterns.helpText"
    defaultMessage={
      'Matching URLs will be traced and linked with APM data. You can specify the URLs using the glob pattern {wildcard} or a segment of a URL. For example a value of {patternExample1} will match all /img/ urls on all subdomains of elastic.co. and a value of {patternExample2} will match any URL containing the segment "img".'
    }
    values={{
      wildcard: <EuiCode>{'*'}</EuiCode>,
      patternExample1: <EuiCode>{'*.elastic.co/img/*'}</EuiCode>,
      patternExample2: <EuiCode>{'/img/'}</EuiCode>,
    }}
  />
);
