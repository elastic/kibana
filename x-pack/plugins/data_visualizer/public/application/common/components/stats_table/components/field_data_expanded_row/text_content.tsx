/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, Fragment } from 'react';
import { EuiCallOut, EuiSpacer, EuiFlexItem } from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';

import type { FieldDataRowProps } from '../../types/field_data_row';
import { ExamplesList } from '../../../examples_list';
import { ExpandedRowContent } from './expanded_row_content';

export const TextContent: FC<FieldDataRowProps> = ({ config }) => {
  const { stats } = config;
  if (stats === undefined) return null;

  const { examples } = stats;
  if (examples === undefined) return null;

  const numExamples = examples.length;

  return (
    <ExpandedRowContent dataTestSubj={'dataVisualizerTextContent'}>
      <EuiFlexItem grow={false} className="dvText__wrapper">
        {numExamples > 0 && <ExamplesList examples={examples} />}
        {numExamples === 0 && (
          <Fragment>
            <EuiSpacer size="xs" />
            <EuiCallOut
              size="s"
              title={i18n.translate(
                'xpack.dataVisualizer.dataGrid.fieldText.noExamplesForFieldsTitle',
                {
                  defaultMessage: 'No examples were obtained for this field',
                }
              )}
              iconType="alert"
            >
              <FormattedMessage
                id="xpack.dataVisualizer.dataGrid.fieldText.fieldNotPresentDescription"
                defaultMessage="This field was not present in the {sourceParam} field of documents queried."
                values={{
                  sourceParam: <span className="dvExpandedRow__codeContent">_source</span>,
                }}
              />

              <EuiSpacer size="s" />

              <FormattedMessage
                id="xpack.dataVisualizer.dataGrid.fieldText.fieldMayBePopulatedDescription"
                defaultMessage="It may be populated, for example, using a {copyToParam} parameter in the document mapping, or be pruned from the {sourceParam} field after indexing through the use of {includesParam} and {excludesParam} parameters."
                values={{
                  copyToParam: <span className="dvExpandedRow__codeContent">copy_to</span>,
                  sourceParam: <span className="dvExpandedRow__codeContent">_source</span>,
                  includesParam: <span className="dvExpandedRow__codeContent">includes</span>,
                  excludesParam: <span className="dvExpandedRow__codeContent">excludes</span>,
                }}
              />
            </EuiCallOut>
          </Fragment>
        )}
      </EuiFlexItem>
    </ExpandedRowContent>
  );
};
