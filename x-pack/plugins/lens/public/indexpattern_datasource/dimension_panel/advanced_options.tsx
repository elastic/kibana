/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSpacer, EuiAccordion, EuiText, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { AdvancedOption } from '../operations/definitions';

export function AdvancedOptions(props: { options: AdvancedOption[] }) {
  const { euiTheme } = useEuiTheme();
  return (
    <EuiAccordion
      id="advancedOptionsAccordion"
      arrowProps={{ color: 'primary' }}
      data-test-subj="indexPattern-advanced-accordion"
      buttonContent={
        <EuiText size="s" color={euiTheme.colors.primary}>
          {i18n.translate('xpack.lens.indexPattern.advancedSettings', {
            defaultMessage: 'Advanced',
          })}
        </EuiText>
      }
    >
      {props.options.map(({ dataTestSubj, inlineElement }) => (
        <div key={dataTestSubj} data-test-subj={dataTestSubj}>
          <EuiSpacer size="s" />
          {inlineElement}
        </div>
      ))}
    </EuiAccordion>
  );
}
