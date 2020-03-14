/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import {
  EuiIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiPanel,
  EuiTabbedContent,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { Response } from '../../common/types';
import { OutputTab } from './output_tab';
import { ParametersTab } from './parameters_tab';
import { ContextTab } from './context_tab';

interface Props {
  isLoading: boolean;
  response?: Response;
  context: string;
  parameters: string;
  index: string;
  document: string;
  onContextChange: (change: string) => void;
  onParametersChange: (change: string) => void;
  onIndexChange: (change: string) => void;
  onDocumentChange: (change: string) => void;
}

export function OutputPane({
  isLoading,
  response,
  context,
  parameters,
  index,
  document,
  onContextChange,
  onParametersChange,
  onIndexChange,
  onDocumentChange,
}: Props) {
  const outputTabLabel = (
    <EuiFlexGroup gutterSize="s" alignItems="center">
      <EuiFlexItem grow={false}>
        {isLoading ? (
          <EuiLoadingSpinner size="m" />
        ) : response && response.error ? (
          <EuiIcon type="alert" color="danger" />
        ) : (
          <EuiIcon type="check" color="secondary" />
        )}
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        {i18n.translate('xpack.painlessLab.outputTabLabel', {
          defaultMessage: 'Output',
        })}
      </EuiFlexItem>
    </EuiFlexGroup>
  );

  return (
    <EuiPanel className="painlessLabRightPane">
      <EuiTabbedContent
        className="painlessLabRightPane__tabs"
        size="s"
        tabs={[
          {
            id: 'output',
            // TODO: Currently this causes an Eui prop error because it is expecting string, but we give it React.ReactNode - should fix.
            name: outputTabLabel as any,
            content: <OutputTab response={response} />,
          },
          {
            id: 'parameters',
            name: i18n.translate('xpack.painlessLab.parametersTabLabel', {
              defaultMessage: 'Parameters',
            }),
            content: (
              <ParametersTab parameters={parameters} onParametersChange={onParametersChange} />
            ),
          },
          {
            id: 'context',
            name: i18n.translate('xpack.painlessLab.contextTabLabel', {
              defaultMessage: 'Context',
            }),
            content: (
              <ContextTab
                context={context}
                index={index}
                document={document}
                onContextChange={onContextChange}
                onIndexChange={onIndexChange}
                onDocumentChange={onDocumentChange}
              />
            ),
          },
        ]}
      />
    </EuiPanel>
  );
}
