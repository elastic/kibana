/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { i18n } from '@kbn/i18n';

import { flashSuccessToast } from '../../../../../shared/flash_messages';
import { getErrorsFromHttpResponse } from '../../../../../shared/flash_messages/handle_api_errors';

import { HttpLogic } from '../../../../../shared/http';
import { KibanaLogic } from '../../../../../shared/kibana';
import { ENGINE_CRAWLER_DOMAIN_PATH } from '../../../../routes';
import { EngineLogic, generateEnginePath } from '../../../engine';

import { CrawlerLogic } from '../../crawler_logic';
import {
  CrawlerDataFromServer,
  CrawlerDomain,
  CrawlerDomainValidationResult,
  CrawlerDomainValidationResultChange,
  CrawlerDomainValidationResultFromServer,
  CrawlerDomainValidationStepName,
} from '../../types';
import { crawlDomainValidationToResult, crawlerDataServerToClient } from '../../utils';

import {
  domainValidationFailureResultChange,
  extractDomainAndEntryPointFromUrl,
  getDomainWithProtocol,
} from './utils';

export interface AddDomainLogicValues {
  addDomainFormInputValue: string;
  allowSubmit: boolean;
  canIgnoreValidationFailure: boolean;
  domainValidationResult: CrawlerDomainValidationResult;
  entryPointValue: string;
  errors: string[];
  hasBlockingFailure: boolean;
  hasValidationCompleted: boolean;
  ignoreValidationFailure: boolean;
  isValidationLoading: boolean;
  displayValidation: boolean;
}

export interface AddDomainLogicActions {
  clearDomainFormInputValue(): void;
  onSubmitNewDomainError(errors: string[]): { errors: string[] };
  onSubmitNewDomainSuccess(domain: CrawlerDomain): { domain: CrawlerDomain };
  performDomainValidationStep(
    stepName: CrawlerDomainValidationStepName,
    checks: string[]
  ): {
    stepName: CrawlerDomainValidationStepName;
    checks: string[];
  };
  setAddDomainFormInputValue(newValue: string): string;
  setDomainValidationResult(change: CrawlerDomainValidationResultChange): {
    change: CrawlerDomainValidationResultChange;
  };
  setIgnoreValidationFailure(newValue: boolean): boolean;
  startDomainValidation(): void;
  submitNewDomain(): void;
  validateDomainInitialVerification(
    newValue: string,
    newEntryPointValue: string
  ): { newValue: string; newEntryPointValue: string };
  validateDomainContentVerification(): void;
  validateDomainIndexingRestrictions(): void;
  validateDomainNetworkConnectivity(): void;
}

const DEFAULT_SELECTOR_VALUES = {
  addDomainFormInputValue: 'https://',
  entryPointValue: '/',
  domainValidationResult: {
    steps: {
      contentVerification: { state: '' },
      indexingRestrictions: { state: '' },
      initialValidation: { state: '' },
      networkConnectivity: { state: '' },
    },
  } as CrawlerDomainValidationResult,
  allowSubmit: false,
  ignoreValidationFailure: false,
  isValidationLoading: false,
};

export const AddDomainLogic = kea<MakeLogicType<AddDomainLogicValues, AddDomainLogicActions>>({
  path: ['enterprise_search', 'app_search', 'crawler', 'add_domain'],
  actions: () => ({
    clearDomainFormInputValue: true,
    initialValidation: true,
    performDomainValidationStep: (stepName, checks) => ({ stepName, checks }),
    onSubmitNewDomainSuccess: (domain) => ({ domain }),
    onSubmitNewDomainError: (errors) => ({ errors }),
    setAddDomainFormInputValue: (newValue) => newValue,
    setDomainValidationResult: (change: CrawlerDomainValidationResultChange) => ({ change }),
    setIgnoreValidationFailure: (newValue) => newValue,
    startDomainValidation: true,
    submitNewDomain: true,
    validateDomainInitialVerification: (newValue, newEntryPointValue) => ({
      newValue,
      newEntryPointValue,
    }),
    validateDomainContentVerification: true,
    validateDomainIndexingRestrictions: true,
    validateDomainNetworkConnectivity: true,
  }),
  reducers: () => ({
    addDomainFormInputValue: [
      DEFAULT_SELECTOR_VALUES.addDomainFormInputValue,
      {
        clearDomainFormInputValue: () => DEFAULT_SELECTOR_VALUES.addDomainFormInputValue,
        setAddDomainFormInputValue: (_, newValue: string) => newValue,
        validateDomainInitialVerification: (_, { newValue }: { newValue: string }) => newValue,
      },
    ],
    domainValidationResult: [
      DEFAULT_SELECTOR_VALUES.domainValidationResult,
      {
        clearDomainFormInputValue: () => DEFAULT_SELECTOR_VALUES.domainValidationResult,
        setAddDomainFormInputValue: () => DEFAULT_SELECTOR_VALUES.domainValidationResult,
        setDomainValidationResult: ({ steps }, { change }) => ({
          steps: {
            ...steps,
            ...change,
          },
        }),
        startDomainValidation: () => ({
          steps: {
            contentVerification: { state: 'loading' },
            indexingRestrictions: { state: 'loading' },
            initialValidation: { state: 'loading' },
            networkConnectivity: { state: 'loading' },
          },
        }),
      },
    ],
    entryPointValue: [
      DEFAULT_SELECTOR_VALUES.entryPointValue,
      {
        clearDomainFormInputValue: () => DEFAULT_SELECTOR_VALUES.entryPointValue,
        setAddDomainFormInputValue: () => DEFAULT_SELECTOR_VALUES.entryPointValue,
        validateDomainInitialVerification: (_, { newEntryPointValue }) => newEntryPointValue,
      },
    ],
    errors: [
      [],
      {
        clearDomainFormInputValue: () => [],
        setAddDomainFormInputValue: () => [],
        validateDomainInitialVerification: () => [],
        submitNewDomain: () => [],
        onSubmitNewDomainError: (_, { errors }) => errors,
      },
    ],
    ignoreValidationFailure: [
      DEFAULT_SELECTOR_VALUES.ignoreValidationFailure,
      {
        clearDomainFormInputValue: () => DEFAULT_SELECTOR_VALUES.ignoreValidationFailure,
        setAddDomainFormInputValue: () => DEFAULT_SELECTOR_VALUES.ignoreValidationFailure,
        setIgnoreValidationFailure: (_, newValue: boolean) => newValue,
      },
    ],
  }),
  selectors: ({ selectors }) => ({
    isValidationLoading: [
      () => [selectors.domainValidationResult],
      (domainValidationResult: CrawlerDomainValidationResult) =>
        !!Object.values(domainValidationResult.steps).find((step) => step.state === 'loading'),
    ],
    hasValidationCompleted: [
      () => [selectors.domainValidationResult],
      (domainValidationResult: CrawlerDomainValidationResult) =>
        !Object.values(domainValidationResult.steps).find(
          (step) => step.state === 'loading' || step.state === ''
        ),
    ],
    hasBlockingFailure: [
      () => [selectors.domainValidationResult],
      (domainValidationResult: CrawlerDomainValidationResult) =>
        !!Object.values(domainValidationResult.steps).find((step) => step.blockingFailure),
    ],
    canIgnoreValidationFailure: [
      () => [selectors.hasValidationCompleted, selectors.domainValidationResult],
      (hasValidationCompleted: boolean, domainValidationResult: CrawlerDomainValidationResult) => {
        if (!hasValidationCompleted) {
          return false;
        }

        return (
          domainValidationResult.steps.indexingRestrictions.blockingFailure ||
          domainValidationResult.steps.contentVerification.blockingFailure
        );
      },
    ],
    allowSubmit: [
      () => [
        selectors.ignoreValidationFailure,
        selectors.hasValidationCompleted,
        selectors.hasBlockingFailure,
      ],
      (ignoreValidationFailure, hasValidationCompleted, hasBlockingFailure) => {
        if (ignoreValidationFailure) {
          return true;
        }

        return hasValidationCompleted && !hasBlockingFailure;
      },
    ],
    displayValidation: [
      () => [selectors.isValidationLoading, selectors.hasValidationCompleted],
      (isValidationLoading, hasValidationCompleted) =>
        isValidationLoading || hasValidationCompleted,
    ],
  }),
  listeners: ({ actions, values }) => ({
    onSubmitNewDomainSuccess: ({ domain }) => {
      flashSuccessToast(
        i18n.translate(
          'xpack.enterpriseSearch.appSearch.crawler.domainsTable.action.add.successMessage',
          {
            defaultMessage: "Successfully added domain '{domainUrl}'",
            values: {
              domainUrl: domain.url,
            },
          }
        )
      );
      KibanaLogic.values.navigateToUrl(
        generateEnginePath(ENGINE_CRAWLER_DOMAIN_PATH, { domainId: domain.id })
      );
    },
    performDomainValidationStep: async ({ stepName, checks }) => {
      const { http } = HttpLogic.values;
      const failureResultChange = domainValidationFailureResultChange(stepName);

      const route = '/internal/app_search/crawler/validate_url';

      try {
        const data = await http.post<CrawlerDomainValidationResultFromServer>(route, {
          body: JSON.stringify({ url: values.addDomainFormInputValue.trim(), checks }),
        });
        const result = crawlDomainValidationToResult(data);

        if (result.blockingFailure) {
          actions.setDomainValidationResult({ [stepName]: result, ...failureResultChange });
        } else {
          actions.setDomainValidationResult({ [stepName]: result });

          // Trigger next step
          switch (stepName) {
            case 'initialValidation':
              actions.validateDomainNetworkConnectivity();
              break;
            case 'networkConnectivity':
              actions.validateDomainIndexingRestrictions();
              break;
            case 'indexingRestrictions':
              actions.validateDomainContentVerification();
              break;
          }
        }
      } catch (e) {
        actions.setDomainValidationResult({
          [stepName]: {
            state: 'invalid',
            blockingFailure: true,
            message: i18n.translate(
              'xpack.enterpriseSearch.appSearch.crawler.addDomainForm.unexpectedValidationErrorMessage',
              { defaultMessage: 'Unexpected error' }
            ),
          },
          ...failureResultChange,
        });
      }
    },
    submitNewDomain: async () => {
      const { http } = HttpLogic.values;
      const { engineName } = EngineLogic.values;

      const requestBody = JSON.stringify({
        name: values.addDomainFormInputValue.trim(),
        entry_points: [{ value: values.entryPointValue }],
      });

      try {
        const response = await http.post(
          `/internal/app_search/engines/${engineName}/crawler/domains`,
          {
            query: {
              respond_with: 'crawler_details',
            },
            body: requestBody,
          }
        );

        const crawlerData = crawlerDataServerToClient(response as CrawlerDataFromServer);
        CrawlerLogic.actions.onReceiveCrawlerData(crawlerData);
        const newDomain = crawlerData.domains[crawlerData.domains.length - 1];
        if (newDomain) {
          actions.onSubmitNewDomainSuccess(newDomain);
        }
        // If there is not a new domain, that means the server responded with a 200 but
        // didn't actually persist the new domain to our BE, and we take no action
      } catch (e) {
        // we surface errors inside the form instead of in flash messages
        const errorMessages = getErrorsFromHttpResponse(e);
        actions.onSubmitNewDomainError(errorMessages);
      }
    },
    startDomainValidation: async () => {
      const { domain, entryPoint } = extractDomainAndEntryPointFromUrl(
        values.addDomainFormInputValue.trim()
      );
      const domainWithProtocol = await getDomainWithProtocol(domain);
      actions.validateDomainInitialVerification(domainWithProtocol, entryPoint);
    },
    validateDomainInitialVerification: () => {
      actions.performDomainValidationStep('initialValidation', ['url']);
    },
    validateDomainContentVerification: () => {
      actions.performDomainValidationStep('contentVerification', ['url_request', 'url_content']);
    },
    validateDomainIndexingRestrictions: () => {
      actions.performDomainValidationStep('indexingRestrictions', ['robots_txt']);
    },
    validateDomainNetworkConnectivity: () => {
      actions.performDomainValidationStep('networkConnectivity', ['dns', 'tcp']);
    },
  }),
});
