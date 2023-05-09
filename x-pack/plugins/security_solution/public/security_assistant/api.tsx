/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import axios from 'axios';
import { SecurityAssistantConversation } from './security_assistant';

export const fetchOpenAlerts = async () => {
  try {
    // TODO: Fetch alerts via alerts API if need be
    return [];
  } catch (error) {
    console.error('Error fetching open alerts:', error);
    throw error;
  }
};

export interface FetchVirusTotalAnalysisProps {
  analysisId: string;
  apiKey: string;
  baseUrl: string;
}
export const fetchVirusTotalAnalysis = async ({
  analysisId,
  apiKey,
  baseUrl,
}: FetchVirusTotalAnalysisProps) => {
  try {
    const response = await axios.get(`${baseUrl}/analyses/${analysisId}`, {
      headers: {
        'x-apikey': apiKey,
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error while fetching analysis from VirusTotal:', error);
    return null;
  }
};

export interface SendFileToVirusTotalProps {
  file: File;
  apiKey: string;
  baseUrl: string;
}
export const sendFileToVirusTotal = async ({
  file,
  apiKey,
  baseUrl,
}: SendFileToVirusTotalProps) => {
  const url = `${baseUrl}/files`;

  const formData = new FormData();
  formData.append('file', file); // Append the file to the FormData object

  try {
    const response = await axios.post(url, formData, {
      headers: {
        'x-apikey': apiKey,
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error while uploading file to VirusTotal:', error);
    throw error;
  }
};

export interface FetchChatCompletionProps {
  conversation: SecurityAssistantConversation;
  baseUrl: string;
  apiKey: string;
  signal?: AbortSignal | undefined;
}
export const fetchChatCompletion = async ({
  conversation,
  baseUrl,
  apiKey,
  signal,
}: FetchChatCompletionProps): Promise<string> => {
  const messages = conversation.map((msg) => ({
    role: msg.role,
    content: msg.content,
  }));

  const requestBody = {
    messages: messages,
    n: 1,
    stop: null,
    temperature: 0.2,
  };

  try {
    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': apiKey,
      },
      body: JSON.stringify(requestBody),
      signal,
    });

    const data = await response.json();
    if (!response.ok) {
      console.error('Error in ChatGPT API response:', data);
      return 'An error occurred while processing your request.';
    }

    if (data.choices && data.choices.length > 0 && data.choices[0].message.content) {
      const result = data.choices[0].message.content.trim();
      return result;
    } else {
      console.error('Unexpected API response format:', data);
      return 'An error occurred while processing your request.';
    }
  } catch (error) {
    console.error('Error while sending message to ChatGPT:', error);
    return 'An error occurred while processing your request.';
  }
};
