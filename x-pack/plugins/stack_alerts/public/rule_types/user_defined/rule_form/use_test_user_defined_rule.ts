/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core-http-browser';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useMutation } from '@tanstack/react-query';
import { testUserDefinedRule } from './test_user_defined_rule';

export const useTestUserDefinedRule = ({
  onSuccess,
  onError,
}: {
  onSuccess: (data: unknown) => void;
  onError: (data: {
    body: {
      message: string;
    };
  }) => void;
}) => {
  const { http } = useKibana<{
    http: HttpSetup;
  }>().services;

  const mutation = ({
    isUrl,
    codeOrUrl,
    customContextVariables,
  }: {
    isUrl: boolean;
    codeOrUrl: string;
    customContextVariables?: Array<{
      name: string;
      description: string;
    }>;
  }) => {
    return testUserDefinedRule({
      http,
      isUrl,
      codeOrUrl,
      customContextVariables,
    });
  };

  return useMutation(mutation, {
    onSuccess,
    onError,
  });
};
