/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  useIsWithinBreakpoints,
  EuiText,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { BulkRequestPanel } from './bulk_request_panel';
import { CollapsiblePanel, CollapsiblePanelRenderProps } from './collapsible_panel';
import { Processor } from '../../../../common/types';

import { getFormRow, getUseField, Field, JsonEditorField } from '../../../shared_imports';

import {
  ProcessorsEditorContextProvider,
  OnUpdateHandler,
  OnDoneLoadJsonHandler,
  PipelineEditor,
} from '../pipeline_editor';

interface Props {
  processors: Processor[];
  onFailure?: Processor[];
  onLoadJson: OnDoneLoadJsonHandler;
  onProcessorsUpdate: OnUpdateHandler;
  hasVersion: boolean;
  hasMeta: boolean;
  onEditorFlyoutOpen: () => void;
  isEditing?: boolean;
  canEditName?: boolean;
}

const UseField = getUseField({ component: Field });
const FormRow = getFormRow({ titleTag: 'h3' });

const COLUMN_MAX_WIDTH = 420;

export const PipelineFormFields: React.FunctionComponent<Props> = ({
  processors,
  onFailure,
  onLoadJson,
  onProcessorsUpdate,
  hasVersion,
  hasMeta,
  onEditorFlyoutOpen,
  canEditName,
  isEditing,
}) => {
  const shouldHaveFixedWidth = useIsWithinBreakpoints(['l', 'xl']);

  return (
    <>
      {/* Name field with optional version field */}
      <FormRow
        title={<FormattedMessage id="xpack.ingestPipelines.form.nameTitle" defaultMessage="Name" />}
        description={
          <FormattedMessage
            id="xpack.ingestPipelines.form.nameDescription"
            defaultMessage="A unique identifier for this pipeline."
          />
        }
      >
        <UseField
          path="name"
          componentProps={{
            ['data-test-subj']: 'nameField',
            euiFieldProps: { disabled: canEditName === false || Boolean(isEditing) },
          }}
        />
      </FormRow>

      <EuiSpacer size="xl" />

      {/* Description field */}
      <FormRow
        title={
          <FormattedMessage
            id="xpack.ingestPipelines.form.descriptionFieldTitle"
            defaultMessage="Description"
          />
        }
        description={
          <FormattedMessage
            id="xpack.ingestPipelines.form.descriptionFieldDescription"
            defaultMessage="A description of what this pipeline does."
          />
        }
      >
        <UseField
          path="description"
          componentProps={{
            ['data-test-subj']: 'descriptionField',
            euiFieldProps: {
              compressed: true,
            },
          }}
        />
      </FormRow>

      <EuiSpacer size="xl" />

      <EuiFlexGroup gutterSize="xl">
        <EuiFlexItem>
          {/* Pipeline Processors Editor */}
          <ProcessorsEditorContextProvider
            onFlyoutOpen={onEditorFlyoutOpen}
            onUpdate={onProcessorsUpdate}
            value={{ processors, onFailure }}
          >
            <PipelineEditor onLoadJson={onLoadJson} />
          </ProcessorsEditorContextProvider>
        </EuiFlexItem>

        <EuiFlexItem css={shouldHaveFixedWidth ? { maxWidth: COLUMN_MAX_WIDTH } : {}}>
          <CollapsiblePanel
            title={
              <EuiText size="s">
                <strong>
                  <FormattedMessage
                    id="xpack.ingestPipelines.form.versionCardTitle"
                    defaultMessage="Add version number"
                  />
                </strong>
              </EuiText>
            }
            fieldName="version"
            toggleProps={{
              'data-test-subj': 'versionToggle',
            }}
            accordionProps={{
              'data-test-subj': 'versionAccordion',
            }}
            initialToggleState={hasVersion}
          >
            {({ isEnabled }: CollapsiblePanelRenderProps) => (
              <>
                <UseField
                  path="version"
                  componentProps={{
                    ['data-test-subj']: 'versionField',
                    euiFieldProps: {
                      disabled: !isEnabled,
                    },
                  }}
                />
              </>
            )}
          </CollapsiblePanel>

          <EuiSpacer size="l" />

          <CollapsiblePanel
            title={
              <EuiText size="s">
                <strong>
                  <FormattedMessage
                    id="xpack.ingestPipelines.form.metadataCardTitle"
                    defaultMessage="Add metadata"
                  />
                </strong>
              </EuiText>
            }
            fieldName="_meta"
            toggleProps={{
              'data-test-subj': 'metaToggle',
            }}
            accordionProps={{
              'data-test-subj': 'metaAccordion',
            }}
            initialToggleState={hasMeta}
          >
            {({ isEnabled }: CollapsiblePanelRenderProps) => (
              <>
                <EuiText size="s" color="subdued">
                  <FormattedMessage
                    id="xpack.ingestPipelines.form.metaDescription"
                    defaultMessage="Any additional information about the ingest pipeline. This information is stored in the cluster state, so best to keep it short."
                  />
                </EuiText>

                <EuiSpacer size="m" />

                <UseField
                  path="_meta"
                  component={JsonEditorField}
                  componentProps={{
                    codeEditorProps: {
                      readOnly: true,
                      'data-test-subj': 'metaEditor',
                      height: '200px',
                      'aria-label': i18n.translate('xpack.ingestPipelines.form.metaAriaLabel', {
                        defaultMessage: '_meta field data editor',
                      }),
                      options: {
                        readOnly: !isEnabled,
                        lineNumbers: 'off',
                        tabSize: 2,
                        automaticLayout: true,
                      },
                    },
                  }}
                />
              </>
            )}
          </CollapsiblePanel>

          <EuiSpacer size="l" />

          <BulkRequestPanel />
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};
