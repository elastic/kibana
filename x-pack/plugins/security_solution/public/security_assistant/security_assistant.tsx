/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { EuiCommentProps } from '@elastic/eui';
import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiCopy,
  EuiTextArea,
  EuiButtonIcon,
  EuiHorizontalRule,
  EuiCommentList,
  EuiAvatar,
  EuiPageHeader,
  EuiFilePicker,
  EuiMarkdownFormat,
  EuiIcon,
} from '@elastic/eui';
import crypto from 'crypto';
import type { DataProvider } from '@kbn/timelines-plugin/common';
import { CommentType } from '@kbn/cases-plugin/common';
import styled from 'styled-components';

import { fetchOpenAlerts, fetchVirusTotalAnalysis, sendFileToVirusTotal, sendMessage } from './api';
import { useKibana } from '../common/lib/kibana';
import type { SecurityAssistantUiSettings } from './helpers';
import { fetchVirusTotalReport } from './helpers';
import { SendToTimelineButton } from './send_to_timeline_button';

const CommentsContainer = styled.div`
  max-height: 600px;
  overflow-y: scroll;
`;

export const SECURITY_ASSISTANT_UI_SETTING_KEY = 'securityAssistant';

export interface SecurityAssistantProps {
  input?: string;
  useLocalStorage?: boolean;
}

export const SecurityAssistant: React.FC<SecurityAssistantProps> =
  React.memo<SecurityAssistantProps>(({ input = '' }) => {
    const bottomRef = useRef<HTMLDivElement | null>(null);
    const { uiSettings } = useKibana().services;
    const [inputText, setInputText] = useState<string>(input);
    const [lastResponse, setLastResponse] = useState<string>('');
    const [chatHistory, setChatHistory] = useState<
      Array<{
        role: 'system' | 'user' | 'assistant';
        content: string;
        timestamp: string;
      }>
    >([]);

    // Fetch secrets from configuration
    const { virusTotal, openAI } = uiSettings.get<SecurityAssistantUiSettings>(
      SECURITY_ASSISTANT_UI_SETTING_KEY
    );

    // New code from Garrett for attach to case action
    // Attach to case support
    const { cases } = useKibana().services;
    const selectCaseModal = cases.hooks.useCasesAddToExistingCaseModal({
      onClose: () => {},
      onSuccess: () => {},
    });
    const handleAddToExistingCaseClick = useCallback(
      (messageContents: string) => {
        selectCaseModal.open({
          getAttachments: () => [
            {
              comment: messageContents,
              type: CommentType.user,
              owner: 'Elastic Security Assistant++',
            },
          ],
        });
      },
      [selectCaseModal]
    );
    ////

    const now = new Date();
    const dateTimeString = now.toLocaleString();

    async function handleOpenAlerts() {
      try {
        const response = await fetchOpenAlerts();
        if (response) {
          console.log('Response from Open Alerts API:', response);
          const formattedResponseComponent = formatOpenAlertsResponse(response);
          console.log('Response from formatting', formattedResponseComponent);
          setChatHistory((prevChatHistory) => [
            ...prevChatHistory,
            { role: 'assistant', content: formattedResponseComponent, timestamp: dateTimeString },
          ]);
        } else {
          console.error('Error: Response from Open Alerts API is empty or undefined.');
        }
      } catch (error) {
        console.error('Error while fetching Open Alerts:', error);
        setChatHistory((prevChatHistory) => [
          ...prevChatHistory,
          {
            role: 'assistant',
            content: 'An error occurred while processing your request. Please try again later.',
            timestamp: dateTimeString,
          },
        ]);
      }
    }

    const formatVirusTotalResponse = (response: any) => {
      const { data } = response;
      const { attributes } = data;

      const { last_analysis_stats, magic, meaningful_name, sha256 } = attributes;

      const mdResponse =
        `**File Name:** [${meaningful_name}](https://www.virustotal.com/gui/file/${sha256});\n\n` +
        `**File Type:** ${magic}\n\n` +
        `**Scan Results:**\n\n` +
        `  - Malicious: ${last_analysis_stats.malicious}\n` +
        `  - Suspicious: ${last_analysis_stats.suspicious}\n` +
        `  - Undetected: ${last_analysis_stats.undetected}\n` +
        `  - Timeout: ${last_analysis_stats.timeout}\n\n`;

      return mdResponse;
    };

    const formatfileVirusTotalResponse = (response: any, sha256Hash: any) => {
      if (!response || !response.data) {
        return 'An error occurred while processing your request.';
      }

      const { data } = response;
      const { attributes } = data;
      const { results } = attributes;

      console.log(response);
      const stats = response.data.attributes.stats;
      // const links = response.data.attributes.links;
      const result =
        `**VirusTotal analysis results for \`${sha256Hash}\`**:\n\n` +
        `- Malicious: ${stats.malicious}\n` +
        `- Suspicious: ${stats.suspicious}\n` +
        `- Undetected: ${stats.undetected}\n\n` +
        `**Elastic Specific Results**\n\n` +
        `- Category: ${results.Elastic.category}\n` +
        `- Type/Signature: ${results.Elastic.result}\n` +
        `- Artifact Version: ${results.Elastic.engine_version}\n\n` +
        `**View On [VirusTotal](https://www.virustotal.com/gui/file/${sha256Hash})**`;

      return result;
    };

    function isFileHash(prompt: string): boolean {
      return prompt.toLowerCase().startsWith('check this hash');
    }

    function formatOpenAlertsResponse(response: any): string {
      console.log('Open alerts response:', response);

      // Check if the response object has the hits property and if it has any elements.
      if (!response || response.length === 0) {
        return 'An error occurred while formatting alerts.';
      }

      let formattedAlerts =
        'Here are the alerts which are currently open. Which one can I help you with?\n\n';
      formattedAlerts +=
        '| # | Alert Name | Severity | Event Reason | User Risk Score | Host Risk Score |\n';
      formattedAlerts += '|---|------------|----------|----------|----------|----------|\n';

      response.forEach((alert: any, index: any) => {
        const { _source } = alert;

        const alertName = _source['kibana.alert.rule.name'];
        const severity = _source['kibana.alert.severity'];
        const reason = _source['kibana.alert.reason'];
        const user = _source.user;
        const host = _source.host;

        const userRisk = user && user.risk ? user.risk.calculated_level : 'N/A';
        const hostRisk = host && host.risk ? host.risk.calculated_level : 'N/A';

        formattedAlerts += `| ${
          index + 1
        } | ${alertName} | ${severity} | ${reason} | ${userRisk} | ${hostRisk} |\n`;
      });
      return formattedAlerts;
    }

    const handleInputChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      setInputText(event.target.value);
    };
    const [isLoading, setIsLoading] = useState(false);
    const sendMessageLocal = useCallback(async () => {
      if (!inputText.trim()) {
        return;
      }

      setIsLoading(true);

      setChatHistory((prevChatHistory) => [
        ...prevChatHistory,
        { role: 'user', content: inputText, timestamp: dateTimeString },
      ]);
      setInputText('');

      const newChatHistory = [
        ...chatHistory,
        { role: 'user', content: inputText, isReactNode: false },
      ];

      if (inputText.toLowerCase() === 'i need help with alerts') {
        await handleOpenAlerts();
      } else if (isFileHash(inputText)) {
        const fileHash = inputText.split(' ')[3]; // Assuming the format is "check this hash <hash>"
        try {
          const result = await fetchVirusTotalReport(fileHash);
          console.log('VirusTotal response:', result);
          const markdownReport = formatVirusTotalResponse(result);
          setChatHistory((prevChatHistory) => [
            ...prevChatHistory,
            { role: 'assistant', content: markdownReport, timestamp: dateTimeString },
          ]);
          setLastResponse(markdownReport);
        } catch (error) {
          console.error('Error while fetching VirusTotal report:', error);
          setChatHistory((prevChatHistory) => [
            ...prevChatHistory,
            {
              role: 'assistant',
              content: 'An error occurred while processing your request. Please try again later.',
              timestamp: dateTimeString,
            },
          ]);
        }
      } else {
        const response = await sendMessage({
          conversation: newChatHistory,
          baseUrl: openAI.baseUrl,
          apiKey: openAI.apiKey,
        });
        if (response) {
          setChatHistory((prevChatHistory) => [
            ...prevChatHistory,
            { role: 'assistant', content: response, timestamp: dateTimeString },
          ]);
          setLastResponse(response);
        } else {
          console.error('Error: Response from LLM API is empty or undefined.');
        }
      }

      setIsLoading(false);
    }, [inputText, chatHistory, dateTimeString, handleOpenAlerts, openAI.baseUrl, openAI.apiKey]);

    useEffect(() => {
      if (chatHistory.length === 0) {
        sendMessageLocal();
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
    }, [chatHistory.length, input, sendMessageLocal]);

    useEffect(() => {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [lastResponse]);

    const clearChat = () => {
      setChatHistory([]);
    };

    const [filePickerKey, setFilePickerKey] = useState<number>(0);
    const handleFileUpload = async (files: FileList | null) => {
      if (!files || files.length === 0) {
        return;
      }

      const file = files[0];
      const fileReader = new FileReader();
      fileReader.onload = async (event) => {
        if (event.target && event.target.result) {
          const fileContent = event.target.result as ArrayBuffer;
          // const base64File = btoa(String.fromCharCode(...new Uint8Array(fileContent)));

          // Calculate the SHA-256 hash
          const hash = crypto.createHash('sha256');
          hash.update(new Uint8Array(fileContent));
          const sha256Hash = hash.digest('hex');

          // Call VirusTotal API to upload the file
          const response = await sendFileToVirusTotal({
            file,
            apiKey: virusTotal.apiKey,
            baseUrl: virusTotal.baseUrl,
          });
          if (response) {
            // Add message to chat history
            setChatHistory((prevChatHistory) => [
              ...prevChatHistory,
              {
                role: 'assistant',
                content: `The file with SHA-256 hash \`${sha256Hash}\` has been uploaded to VirusTotal. The results will be displayed once the analysis is complete.`,
                timestamp: dateTimeString,
                isReactNode: false,
              },
            ]);

            setFilePickerKey((prevKey) => prevKey + 1);
            const analysisId = response.data.id;

            // Poll for the analysis status
            let analysisResponse = null;
            let isAnalysisComplete = false;
            while (!isAnalysisComplete) {
              analysisResponse = await fetchVirusTotalAnalysis({
                analysisId,
                apiKey: virusTotal.apiKey,
                baseUrl: virusTotal.baseUrl,
              });

              if (analysisResponse && analysisResponse.data.attributes.status === 'completed') {
                isAnalysisComplete = true;
              } else {
                // Wait for a while before polling again
                await new Promise((resolve) => setTimeout(resolve, 5000));
              }
            }

            // Handle VirusTotal response
            const virusTotalResult = formatfileVirusTotalResponse(analysisResponse, sha256Hash);
            setChatHistory((prevChatHistory) => [
              ...prevChatHistory,
              {
                role: 'assistant',
                content: virusTotalResult,
                timestamp: dateTimeString,
                isReactNode: false,
              },
            ]);
            setFilePickerKey((prevKey) => prevKey + 1);
          } else {
            console.error('Error: Response from VirusTotal API is empty or undefined.');
          }
        }
      };
      fileReader.readAsArrayBuffer(file);
    };

    // New Code from Garrett for Add To Timeline action
    // Grab all relevant dom elements
    const commentBlocks = [...document.getElementsByClassName('euiMarkdownFormat')];
    // Filter if no code block exists as to not make extra portals
    commentBlocks.filter((cb) => cb.querySelectorAll('.euiCodeBlock__code').length > 0);

    let commentDetails =
      chatHistory.length > 0
        ? commentBlocks.map((commentBlock) => {
            return {
              commentBlock,
              codeBlocks: [...commentBlock.querySelectorAll('.euiCodeBlock__code')],
              codeBlockControls: [...commentBlock.querySelectorAll('.euiCodeBlock__controls')],
            };
          })
        : [];
    commentDetails = commentDetails.map((details) => {
      const dataProviders: DataProvider[] = details.codeBlocks.map((codeBlock, i) => {
        return {
          id: 'assistant-data-provider',
          name: 'Assistant Query',
          enabled: true,
          // overriding to use as isEQL
          excluded: details.commentBlock?.textContent?.includes('EQL') ?? false,
          kqlQuery: codeBlock.textContent ?? '',
          queryMatch: {
            field: 'host.name',
            operator: ':',
            value: 'test',
          },
          and: [],
        };
      });
      return {
        ...details,
        dataProviders,
      };
    });

    // Add min-height to all codeblocks so timeline icon doesn't overflow
    const codeBlockContainers = [...document.getElementsByClassName('euiCodeBlock')];
    codeBlockContainers.forEach((e) => (e.style.minHeight = '75px'));
    ////

    return (
      <EuiPanel>
        <EuiPageHeader pageTitle="Elastic Security Assistant" iconType="logoSecurity" />

        <EuiHorizontalRule />
        {/* Create portals for each EuiCodeBlock to add the `Investigate in Timeline` action */}
        {chatHistory.length > 0 &&
          commentDetails.length > 0 &&
          commentDetails.map((e) => {
            if (e.dataProviders != null && e.dataProviders.length > 0) {
              return e.codeBlocks.map((block, i) => {
                if (e.codeBlockControls[i] != null) {
                  return createPortal(
                    <SendToTimelineButton
                      asEmptyButton={true}
                      dataProviders={[e.dataProviders?.[i] ?? []]}
                      keepDataView={true}
                    >
                      <EuiIcon type="timeline" />
                    </SendToTimelineButton>,
                    e.codeBlockControls[i]
                  );
                } else {
                  return <></>;
                }
              });
            }
          })}

        <CommentsContainer>
          <EuiCommentList
            comments={chatHistory.map((message, index) => {
              const isUser = message.role === 'user';
              const commentProps: EuiCommentProps = {
                username: isUser ? 'You' : 'Assistant',
                actions: (
                  <>
                    <EuiButtonIcon
                      onClick={() => handleAddToExistingCaseClick(message.content)}
                      iconType="addDataApp"
                      color="primary"
                      aria-label="Add to existing case"
                    />
                    <EuiCopy textToCopy={message.content}>
                      {(copy) => (
                        <EuiButtonIcon
                          onClick={copy}
                          iconType="copyClipboard"
                          color="primary"
                          aria-label="Copy message content to clipboard"
                        />
                      )}
                    </EuiCopy>
                  </>
                ),
                // event: isUser ? 'Asked a question' : 'Responded with',
                children: (
                  <EuiText>
                    <EuiMarkdownFormat>{message.content}</EuiMarkdownFormat>
                  </EuiText>
                ),
                timelineAvatar: isUser ? (
                  <EuiAvatar name="user" size="l" color="subdued" iconType={'logoSecurity'} />
                ) : (
                  <EuiAvatar
                    name="machine"
                    size="l"
                    color="subdued"
                    iconType={'machineLearningApp'}
                  />
                ),
                timestamp: `at: ${message.timestamp}`,
              };
              return commentProps;
            })}
          />
          <div ref={bottomRef} />
        </CommentsContainer>

        <EuiSpacer />

        <EuiFlexGroup gutterSize="s">
          <EuiFlexItem>
            <EuiTextArea
              fullWidth
              placeholder="Ask a question! You can ask anything from things like 'check this hash xxxx' or 'help me with a query I need to build'."
              value={inputText}
              onChange={handleInputChange}
              onKeyPress={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  sendMessageLocal();
                }
              }}
            />
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiFlexGroup direction="column" gutterSize="s">
              <EuiFlexItem>
                <EuiFilePicker
                  key={filePickerKey}
                  compressed={true}
                  initialPromptText="Select a file to upload to VirusTotal"
                  onChange={(files) => handleFileUpload(files)}
                />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiFlexGroup gutterSize="xs">
                  <EuiFlexItem>
                    <EuiButton
                      fill
                      iconType="returnKey"
                      onClick={sendMessageLocal}
                      isLoading={isLoading}
                    >
                      Send
                    </EuiButton>
                  </EuiFlexItem>

                  <EuiFlexItem>
                    <EuiButton iconType="refresh" onClick={clearChat} color="danger">
                      Clear
                    </EuiButton>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    );
  });
SecurityAssistant.displayName = 'SecurityAssistant';
