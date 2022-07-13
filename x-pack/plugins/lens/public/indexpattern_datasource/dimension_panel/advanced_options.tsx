/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSpacer, EuiAccordion } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { AdvancedOption } from '../operations/definitions';

export function AdvancedOptions(props: { options: AdvancedOption[] }) {
  return (
    <EuiAccordion
      id="advancedOptionsAccordion"
      buttonContent={i18n.translate('xpack.lens.indexPattern.advancedSettings', {
        defaultMessage: 'Advanced options',
      })}
    >
      {props.options.map(({ dataTestSubj, inlineElement }) => (
        <React.Fragment key={dataTestSubj}>
          <EuiSpacer size="s" />
          {inlineElement}
        </React.Fragment>
      ))}
    </EuiAccordion>
  );
}
