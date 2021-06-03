/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';

import { EuiListGroup, EuiListGroupItem } from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n/react';
import { ExpandedRowFieldHeader } from '../stats_table/components/expanded_row_field_header';
interface Props {
  examples: Array<string | object>;
}

export const ExamplesList: FC<Props> = ({ examples }) => {
  if (examples === undefined || examples === null || !Array.isArray(examples)) {
    return null;
  }
  let examplesContent;
  if (examples.length === 0) {
    examplesContent = (
      <FormattedMessage
        id="xpack.dataVisualizer.dataGrid.field.examplesList.noExamplesMessage"
        defaultMessage="No examples were obtained for this field"
      />
    );
  } else {
    examplesContent = examples.map((example, i) => {
      return (
        <EuiListGroupItem
          className="fieldDataCard__codeContent"
          size="s"
          key={`example_${i}`}
          label={typeof example === 'string' ? example : JSON.stringify(example)}
        />
      );
    });
  }

  return (
    <div data-test-subj="dataVisualizerFieldDataExamplesList">
      <ExpandedRowFieldHeader>
        <FormattedMessage
          id="xpack.dataVisualizer.dataGrid.field.examplesList.title"
          defaultMessage="{numExamples, plural, one {Value} other {Examples}}"
          values={{
            numExamples: examples.length,
          }}
        />
      </ExpandedRowFieldHeader>
      <EuiListGroup showToolTips={true} maxWidth={'s'} gutterSize={'none'} flush={true}>
        {examplesContent}
      </EuiListGroup>
    </div>
  );
};
