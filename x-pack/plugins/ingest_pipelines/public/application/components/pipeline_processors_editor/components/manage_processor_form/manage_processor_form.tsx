/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { FunctionComponent, memo, useEffect, useState } from 'react';
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

export interface Props {
  isOnFailure: boolean;
  processor?: ProcessorInternal;
  form: FormHook;
  onClose: () => void;
  onOpen: () => void;
  esDocsBasePath: string;
}

const updateButtonLabel = i18n.translate(
  'xpack.ingestPipelines.settingsFormOnFailureFlyout.updateButtonLabel',
  { defaultMessage: 'Update' }
);

const addButtonLabel = i18n.translate(
  'xpack.ingestPipelines.settingsFormOnFailureFlyout.addButtonLabel',
  { defaultMessage: 'Add' }
);

const cancelButtonLabel = i18n.translate(
  'xpack.ingestPipelines.settingsFormOnFailureFlyout.cancelButtonLabel',
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

const getFlyoutTitle = (isOnFailure: boolean, isExistingProcessor: boolean) => {
  if (isExistingProcessor) {
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
  }

  return isOnFailure ? (
    <FormattedMessage
      id="xpack.ingestPipelines.settingsFormOnFailureFlyout.configureOnFailureTitle"
      defaultMessage="Configure on-failure processor"
    />
  ) : (
    <FormattedMessage
      id="xpack.ingestPipelines.settingsFormOnFailureFlyout.configureTitle"
      defaultMessage="Configure processor"
    />
  );
};

export const ManageProcessorForm: FunctionComponent<Props> = memo(
  ({ processor, form, isOnFailure, onClose, onOpen, esDocsBasePath }) => {
    const { testPipelineData, setCurrentTestPipelineData } = useTestPipelineContext();
    const {
      testOutputPerProcessor,
      config: { selectedDocumentIndex, documents },
    } = testPipelineData;

    const processorOutput =
      processor &&
      testOutputPerProcessor &&
      testOutputPerProcessor[selectedDocumentIndex][processor.id];

    const updateSelectedDocument = (index: number) => {
      setCurrentTestPipelineData({
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
        />
      );
    } else {
      flyoutContent = <ProcessorSettingsFields processor={processor} />;
    }

    return (
      <Form data-test-subj="processorSettingsForm" form={form}>
        <EuiFlyout size="m" maxWidth={720} onClose={onClose}>
          <EuiFlyoutHeader>
            <EuiFlexGroup gutterSize="xs">
              <EuiFlexItem>
                <div>
                  <EuiTitle size="m">
                    <h2>{getFlyoutTitle(isOnFailure, Boolean(processor))}</h2>
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
            {processor ? (
              <>
                <EuiTabs>
                  {tabs.map((tab) => (
                    <EuiTab
                      onClick={() => {
                        setActiveTab(tab.id);
                      }}
                      isSelected={tab.id === activeTab}
                      key={tab.id}
                      data-test-subj={`${tab.id}Tab`}
                      disabled={
                        (tab.id === 'output' && Boolean(testOutputPerProcessor) === false) ||
                        Boolean(processorOutput) === false
                      }
                    >
                      {tab.name}
                    </EuiTab>
                  ))}
                </EuiTabs>
                <EuiSpacer />
              </>
            ) : undefined}

            {flyoutContent}
          </EuiFlyoutBody>
          <EuiFlyoutFooter>
            <EuiFlexGroup justifyContent="flexEnd">
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty onClick={onClose}>{cancelButtonLabel}</EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton fill data-test-subj="submitButton" onClick={form.submit}>
                  {processor ? updateButtonLabel : addButtonLabel}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlyoutFooter>
        </EuiFlyout>
      </Form>
    );
  },
  (previous, current) => {
    return previous.processor === current.processor;
  }
);
