/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { FunctionComponent, useEffect, useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlyout,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiTabs,
  EuiTab,
  EuiTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
} from '@elastic/eui';

import { Form, FormDataProvider, FormHook } from '../../../../../shared_imports';
import { ProcessorInternal } from '../../types';
import { useTestPipelineContext } from '../../context';
import { getProcessorDescriptor } from '../shared';

import { ProcessorSettingsFields } from './processor_settings_fields';
import { DocumentationButton } from './documentation_button';
import { ProcessorOutput } from './processor_output';
import { Fields } from './processor_form.container';

export interface Props {
  isOnFailure: boolean;
  form: FormHook<Fields>;
  onOpen: () => void;
  esDocsBasePath: string;
  closeFlyout: () => void;
  resetProcessors: () => void;
  handleSubmit: (shouldCloseFlyout?: boolean) => Promise<void>;
  getProcessor: () => ProcessorInternal;
}

const updateButtonLabel = i18n.translate(
  'xpack.ingestPipelines.processorFormFlyout.updateButtonLabel',
  { defaultMessage: 'Update' }
);

const cancelButtonLabel = i18n.translate(
  'xpack.ingestPipelines.processorFormFlyout.cancelButtonLabel',
  { defaultMessage: 'Cancel' }
);

export type TabType = 'configuration' | 'output';

interface Tab {
  id: TabType;
  name: string;
}

const tabs: Tab[] = [
  {
    id: 'configuration',
    name: i18n.translate(
      'xpack.ingestPipelines.settingsFormOnFailureFlyout.configurationTabTitle',
      {
        defaultMessage: 'Configuration',
      }
    ),
  },
  {
    id: 'output',
    name: i18n.translate('xpack.ingestPipelines.settingsFormOnFailureFlyout.outputTabTitle', {
      defaultMessage: 'Output',
    }),
  },
];

const getFlyoutTitle = (isOnFailure: boolean) => {
  return isOnFailure ? (
    <FormattedMessage
      id="xpack.ingestPipelines.settingsFormOnFailureFlyout.manageOnFailureTitle"
      defaultMessage="Manage on-failure processor"
    />
  ) : (
    <FormattedMessage
      id="xpack.ingestPipelines.settingsFormOnFailureFlyout.manageTitle"
      defaultMessage="Manage processor"
    />
  );
};

export const EditProcessorForm: FunctionComponent<Props> = ({
  getProcessor,
  form,
  isOnFailure,
  onOpen,
  esDocsBasePath,
  closeFlyout,
  handleSubmit,
  resetProcessors,
}) => {
  const { testPipelineData, testPipelineDataDispatch } = useTestPipelineContext();
  const {
    testOutputPerProcessor,
    config: { selectedDocumentIndex, documents },
    isExecutingPipeline,
  } = testPipelineData;

  const processor = getProcessor();

  const processorOutput =
    processor &&
    testOutputPerProcessor &&
    testOutputPerProcessor[selectedDocumentIndex][processor.id];

  const updateSelectedDocument = (index: number) => {
    testPipelineDataDispatch({
      type: 'updateActiveDocument',
      payload: {
        config: {
          selectedDocumentIndex: index,
        },
      },
    });
  };

  useEffect(
    () => {
      onOpen();
    },
    [] /* eslint-disable-line react-hooks/exhaustive-deps */
  );

  const [activeTab, setActiveTab] = useState<TabType>('configuration');

  let flyoutContent: React.ReactNode;

  if (activeTab === 'output') {
    flyoutContent = (
      <ProcessorOutput
        processorOutput={processorOutput}
        documents={documents!}
        selectedDocumentIndex={selectedDocumentIndex}
        updateSelectedDocument={updateSelectedDocument}
        isExecuting={isExecutingPipeline}
      />
    );
  } else {
    flyoutContent = <ProcessorSettingsFields processor={processor} />;
  }

  return (
    <Form data-test-subj="editProcessorForm" form={form} onSubmit={handleSubmit}>
      <EuiFlyout
        size="m"
        maxWidth={720}
        onClose={() => {
          resetProcessors();
          closeFlyout();
        }}
      >
        <EuiFlyoutHeader>
          <EuiFlexGroup gutterSize="xs">
            <EuiFlexItem>
              <div>
                <EuiTitle size="m">
                  <h2>{getFlyoutTitle(isOnFailure)}</h2>
                </EuiTitle>
              </div>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <FormDataProvider pathsToWatch="type">
                {({ type }) => {
                  const formDescriptor = getProcessorDescriptor(type as any);

                  if (formDescriptor) {
                    return (
                      <DocumentationButton
                        processorLabel={formDescriptor.label}
                        docLink={esDocsBasePath + formDescriptor.docLinkPath}
                      />
                    );
                  }
                  return null;
                }}
              </FormDataProvider>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          <EuiTabs>
            {tabs.map((tab) => (
              <EuiTab
                onClick={async () => {
                  // No need to do anything if user clicks the already active tab
                  if (tab.id === activeTab) {
                    return;
                  }

                  if (tab.id === 'output') {
                    await handleSubmit(false);
                  } else {
                    form.reset({ defaultValue: { fields: processor.options } });
                  }
                  setActiveTab(tab.id);
                }}
                isSelected={tab.id === activeTab}
                key={tab.id}
                data-test-subj={`${tab.id}Tab`}
                disabled={
                  tab.id === 'output' &&
                  (Boolean(testOutputPerProcessor) === false || Boolean(processorOutput) === false)
                }
              >
                {tab.name}
              </EuiTab>
            ))}
          </EuiTabs>

          <EuiSpacer />

          {flyoutContent}
        </EuiFlyoutBody>
        <EuiFlyoutFooter>
          <EuiFlexGroup justifyContent="flexEnd">
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                onClick={() => {
                  resetProcessors();
                  closeFlyout();
                }}
              >
                {cancelButtonLabel}
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                fill
                disabled={(!form.isValid && form.isSubmitted) || form.isSubmitting}
                data-test-subj="submitButton"
                onClick={async () => {
                  if (activeTab === 'output') {
                    return closeFlyout();
                  }
                  await handleSubmit();
                }}
              >
                {updateButtonLabel}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutFooter>
      </EuiFlyout>
    </Form>
  );
};
