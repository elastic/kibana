/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiSpacer, EuiSwitch, EuiFlexGroup, EuiFlexItem, EuiPanel, EuiCodeBlock } from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { Processor } from '../../../../common/types';

import { getUseField, getFormRow, Field, JsonEditorField } from '../../../shared_imports';

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

const requestExample = `-- I'm an example of SQL
CREATE TABLE "topic" (
  "id" serial NOT NULL PRIMARY KEY,
  "forum_id" integer NOT NULL,
  "subject" varchar(255) NOT NULL
);
ALTER TABLE "topic"
ADD CONSTRAINT forum_id FOREIGN KEY ("forum_id")
REFERENCES "forum" ("id");

insert into "topic" ("forum_id", "subject")
values (2, 'D''artagnian');`;

export const PipelineFormFields: React.FunctionComponent<Props> = ({
  processors,
  onFailure,
  onLoadJson,
  onProcessorsUpdate,
  hasVersion,
  hasMeta,
  onEditorFlyoutOpen,
}) => {
  const [isVersionVisible, setIsVersionVisible] = useState<boolean>(hasVersion);

  const [isMetaVisible, setIsMetaVisible] = useState<boolean>(hasMeta);

  return (
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
      <EuiFlexItem css={{ maxWidth: 420 }}>
        <EuiPanel hasShadow={false} hasBorder grow={false}>
          <EuiFlexGroup gutterSize="xl">
            <EuiFlexItem grow>
              <strong>Add version number</strong>
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
              <EuiSpacer size="xl" />

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
              <strong>Add metadata</strong>
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
              <EuiSpacer size="xl" />

              <FormattedMessage
                id="xpack.ingestPipelines.form.metaDescription"
                defaultMessage="Any additional information about the ingest pipeline. This information is stored in the cluster state, so best to keep it short."
              />

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
          <strong>How to use this pipeline during data ingestion</strong>

          <EuiSpacer size="m" />

          <EuiCodeBlock language="sql" overflowHeight={250} isCopyable>
            {requestExample}
          </EuiCodeBlock>
        </EuiPanel>

      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
