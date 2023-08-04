import React from 'react';
import { TextExpansionCallOutState, TextExpansionDismissButton } from './text_expansion_callout';
import { EuiCallOut, EuiFlexGroup, EuiFlexItem, EuiText, EuiIcon } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export const ModelDeploymentInProgress = ({
  dismiss,
  isDismissable,
}: Pick<TextExpansionCallOutState, 'dismiss' | 'isDismissable'>) => (
  <EuiCallOut color="success">
    <EuiFlexGroup direction="column" gutterSize="s">
      <EuiFlexItem grow>
        <EuiFlexGroup direction="row" gutterSize="s" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiIcon color="success" type="clock" />
          </EuiFlexItem>
          <EuiFlexItem grow>
            <EuiText color="success" size="xs">
              <h3>
                {i18n.translate(
                  'xpack.enterpriseSearch.content.index.pipelines.textExpansionCallOut.deployingTitle',
                  { defaultMessage: 'Your ELSER model is deploying.' }
                )}
              </h3>
            </EuiText>
          </EuiFlexItem>
          {isDismissable && (
            <EuiFlexItem grow={false}>
              <TextExpansionDismissButton dismiss={dismiss} />
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem grow>
        <EuiText size="s">
          <p>
            {i18n.translate(
              'xpack.enterpriseSearch.content.index.pipelines.textExpansionCallOut.deployingBody',
              {
                defaultMessage:
                  'You can continue creating your pipeline with other uploaded models in the meantime.',
              }
            )}
          </p>
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  </EuiCallOut>
);
