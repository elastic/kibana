/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';

import { EuiListGroup, EuiListGroupItem, EuiSpacer } from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n/react';
import { ExpandedRowFieldHeader } from '../../../../stats_datagrid/components/expanded_row_field_header';
interface Props {
  examples: Array<string | object>;
}

export const ExamplesList: FC<Props> = ({ examples }) => {
  if (
    examples === undefined ||
    examples === null ||
    !Array.isArray(examples) ||
    examples.length === 0
  ) {
    return null;
  }

  const examplesContent = examples.map((example, i) => {
    return (
      <EuiListGroupItem
        className="mlFieldDataCard__codeContent"
        size="s"
        key={`example_${i}`}
        label={typeof example === 'string' ? example : JSON.stringify(example)}
      />
    );
  });

  return (
    <div data-test-subj="mlFieldDataCardExamplesList">
      <ExpandedRowFieldHeader>
        <FormattedMessage
          id="xpack.ml.fieldDataCard.cardText.examplesTitle"
          defaultMessage="{numExamples, plural, one {value} other {examples}}"
          values={{
            numExamples: examples.length,
          }}
        />
      </ExpandedRowFieldHeader>
      <EuiSpacer size="s" />
      <EuiListGroup showToolTips={true} maxWidth={'s'} gutterSize={'none'} flush={true}>
        {examplesContent}
      </EuiListGroup>
    </div>
  );
};
