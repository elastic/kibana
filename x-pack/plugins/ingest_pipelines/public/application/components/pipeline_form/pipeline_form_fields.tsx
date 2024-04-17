/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiSpacer, EuiSwitch, EuiFlexGroup, EuiFlexItem, EuiPanel, EuiCodeBlock, useIsWithinBreakpoints, EuiText } from '@elastic/eui';

import { i18n } from '@kbn/i18n';
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
const requestExample = `POST _bulk?pipeline=my-pipeline-name
{"index1": { "_index" : "test", "_id" : "1" }}
{"field1": "value1"}
{"field1": "value3"}
{"update": {"_id" : "1", "_index" : "test"}}
`;

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

  const [isVersionVisible, setIsVersionVisible] = useState<boolean>(hasVersion);
  const [isMetaVisible, setIsMetaVisible] = useState<boolean>(hasMeta);

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
          <EuiPanel hasShadow={false} hasBorder grow={false}>
            <EuiFlexGroup gutterSize="xl">
              <EuiFlexItem grow>
                <EuiText size="s">
                  <strong>
                    <FormattedMessage
                      id="xpack.ingestPipelines.form.versionCardTitle"
                      defaultMessage="Add version number"
                    />
                  </strong>
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiSwitch
                  label={
                    <FormattedMessage
                      id="xpack.ingestPipelines.form.versionToggleDescription"
                      defaultMessage="Enabled"
                    />
                  }
                  checked={isVersionVisible}
                  onChange={(e) => setIsVersionVisible(e.target.checked)}
                  data-test-subj="versionToggle"
                />
              </EuiFlexItem>
            </EuiFlexGroup>

            {isVersionVisible && (
              <>
                <EuiSpacer size="l" />

                <UseField
                  path="version"
                  componentProps={{
                    ['data-test-subj']: 'versionField',
                  }}
                />
              </>
            )}
          </EuiPanel>

          <EuiSpacer size="l" />

          <EuiPanel hasShadow={false} hasBorder grow={false}>
            <EuiFlexGroup gutterSize="xl">
              <EuiFlexItem grow>
                <EuiText size="s">
                  <strong>
                    <FormattedMessage
                      id="xpack.ingestPipelines.form.metadataCardTitle"
                      defaultMessage="Add metadata"
                    />
                  </strong>
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiSwitch
                  label={
                    <FormattedMessage
                      id="xpack.ingestPipelines.form.metaSwitchCaption"
                      defaultMessage="Enabled"
                    />
                  }
                  checked={isMetaVisible}
                  onChange={(e) => setIsMetaVisible(e.target.checked)}
                  data-test-subj="metaToggle"
                />
              </EuiFlexItem>
            </EuiFlexGroup>

            {isMetaVisible && (
              <>
                <EuiSpacer size="l" />


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
                      'data-test-subj': 'metaEditor',
                      height: '200px',
                      'aria-label': i18n.translate('xpack.ingestPipelines.form.metaAriaLabel', {
                        defaultMessage: '_meta field data editor',
                      }),
                    },
                  }}
                />
              </>
            )}
          </EuiPanel>

          <EuiSpacer size="l" />

          <EuiPanel hasShadow={false} hasBorder grow={false}>
            <EuiText size="s">
              <strong>
                <FormattedMessage
                  id="xpack.ingestPipelines.form.bulkCardTitle"
                  defaultMessage="How to use this pipeline during data ingestion"
                />
              </strong>
            </EuiText>

            <EuiSpacer size="l" />

            <EuiCodeBlock language="json" overflowHeight={250} isCopyable>
              {requestExample}
            </EuiCodeBlock>
          </EuiPanel>

        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};
