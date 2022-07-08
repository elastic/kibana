/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { i18n } from '@kbn/i18n';

import { generateEncodedPath } from '../../../../../../shared/encode_path_params';
import { flashSuccessToast } from '../../../../../../shared/flash_messages';
import { getErrorsFromHttpResponse } from '../../../../../../shared/flash_messages/handle_api_errors';
import { HttpLogic } from '../../../../../../shared/http';
import { KibanaLogic } from '../../../../../../shared/kibana';
import { CrawlerDomain, CrawlerDomainFromServer } from '../../../../../api/crawler/types';
import {
  CrawlerDomainValidationResult,
  CrawlerDomainValidationResultChange,
  CrawlerDomainValidationResultFromServer,
  CrawlerDomainValidationStepName,
} from '../../../../../api/crawler/types';
import {
  crawlDomainValidationToResult,
  crawlerDomainServerToClient,
} from '../../../../../api/crawler/utils';
import { SEARCH_INDEX_CRAWLER_DOMAIN_DETAIL_PATH } from '../../../../../routes';
import { IndexNameLogic } from '../../../index_name_logic';
import { CrawlerLogic } from '../../crawler_logic';

import {
  domainValidationFailureResultChange,
  extractDomainAndEntryPointFromUrl,
  getDomainWithProtocol,
} from './utils';

export interface AddDomainLogicValues {
  addDomainFormInputValue: string;
  allowSubmit: boolean;
  canIgnoreValidationFailure: boolean;
  displayValidation: boolean;
  domainValidationResult: CrawlerDomainValidationResult;
  entryPointValue: string;
  errors: string[];
  hasBlockingFailure: boolean;
  hasValidationCompleted: boolean;
  ignoreValidationFailure: boolean;
  isFlyoutVisible: boolean;
  isValidationLoading: boolean;
}

export interface AddDomainLogicActions {
  clearDomainFormInputValue(): void;
  closeFlyout(): void;
  onSubmitNewDomainError(errors: string[]): { errors: string[] };
  onSubmitNewDomainSuccess(domain: CrawlerDomain): { domain: CrawlerDomain };
  openFlyout(): void;
  performDomainValidationStep(
    stepName: CrawlerDomainValidationStepName,
    checks: string[]
  ): {
    checks: string[];
    stepName: CrawlerDomainValidationStepName;
  };
  setAddDomainFormInputValue(newValue: string): string;
  setDomainValidationResult(change: CrawlerDomainValidationResultChange): {
    change: CrawlerDomainValidationResultChange;
  };
  setIgnoreValidationFailure(newValue: boolean): boolean;
  startDomainValidation(): void;
  submitNewDomain(): void;
  validateDomainContentVerification(): void;
  validateDomainIndexingRestrictions(): void;
  validateDomainInitialVerification(
    newValue: string,
    newEntryPointValue: string
  ): { newEntryPointValue: string; newValue: string };
  validateDomainNetworkConnectivity(): void;
}

const DEFAULT_SELECTOR_VALUES = {
  addDomainFormInputValue: 'https://',
  allowSubmit: false,
  domainValidationResult: {
    steps: {
      contentVerification: { state: '' },
      indexingRestrictions: { state: '' },
      initialValidation: { state: '' },
      networkConnectivity: { state: '' },
    },
  } as CrawlerDomainValidationResult,
  entryPointValue: '/',
  ignoreValidationFailure: false,
  isValidationLoading: false,
};

export const AddDomainLogic = kea<MakeLogicType<AddDomainLogicValues, AddDomainLogicActions>>({
  path: ['enterprise_search', 'crawler', 'add_domain_logic'],
  actions: () => ({
    clearDomainFormInputValue: true,
    closeFlyout: true,
    initialValidation: true,
    onSubmitNewDomainError: (errors) => ({ errors }),
    onSubmitNewDomainSuccess: (domain) => ({ domain }),
    openFlyout: true,
    performDomainValidationStep: (stepName, checks) => ({ checks, stepName }),
    setAddDomainFormInputValue: (newValue) => newValue,
    setDomainValidationResult: (change: CrawlerDomainValidationResultChange) => ({ change }),
    setIgnoreValidationFailure: (newValue) => newValue,
    startDomainValidation: true,
    submitNewDomain: true,
    validateDomainContentVerification: true,
    validateDomainIndexingRestrictions: true,
    validateDomainInitialVerification: (newValue, newEntryPointValue) => ({
      newEntryPointValue,
      newValue,
    }),
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
        onSubmitNewDomainError: (_, { errors }) => errors,
        setAddDomainFormInputValue: () => [],
        submitNewDomain: () => [],
        validateDomainInitialVerification: () => [],
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
    isFlyoutVisible: [
      false,
      {
        closeFlyout: () => false,
        onSubmitNewDomainSuccess: () => false,
        openFlyout: () => true,
      },
    ],
  }),
  selectors: ({ selectors }) => ({
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
    displayValidation: [
      () => [selectors.isValidationLoading, selectors.hasValidationCompleted],
      (isValidationLoading, hasValidationCompleted) =>
        isValidationLoading || hasValidationCompleted,
    ],
    hasBlockingFailure: [
      () => [selectors.domainValidationResult],
      (domainValidationResult: CrawlerDomainValidationResult) =>
        !!Object.values(domainValidationResult.steps).find((step) => step.blockingFailure),
    ],
    hasValidationCompleted: [
      () => [selectors.domainValidationResult],
      (domainValidationResult: CrawlerDomainValidationResult) =>
        !Object.values(domainValidationResult.steps).find(
          (step) => step.state === 'loading' || step.state === ''
        ),
    ],
    isValidationLoading: [
      () => [selectors.domainValidationResult],
      (domainValidationResult: CrawlerDomainValidationResult) =>
        !!Object.values(domainValidationResult.steps).find((step) => step.state === 'loading'),
    ],
  }),
  listeners: ({ actions, values }) => ({
    onSubmitNewDomainSuccess: ({ domain }) => {
      const { indexName } = IndexNameLogic.values;
      flashSuccessToast(
        i18n.translate('xpack.enterpriseSearch.crawler.domainsTable.action.add.successMessage', {
          defaultMessage: "Successfully added domain '{domainUrl}'",
          values: {
            domainUrl: domain.url,
          },
        })
      );
      KibanaLogic.values.navigateToUrl(
        generateEncodedPath(SEARCH_INDEX_CRAWLER_DOMAIN_DETAIL_PATH, {
          domainId: domain.id,
          indexName,
        })
      );
      CrawlerLogic.actions.fetchCrawlerData();
    },
    performDomainValidationStep: async ({ stepName, checks }) => {
      const { http } = HttpLogic.values;
      const failureResultChange = domainValidationFailureResultChange(stepName);

      const route = '/internal/enterprise_search/crawler/validate_url';

      try {
        const data = await http.post<CrawlerDomainValidationResultFromServer>(route, {
          body: JSON.stringify({ checks, url: values.addDomainFormInputValue.trim() }),
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
            blockingFailure: true,
            message: i18n.translate(
              'xpack.enterpriseSearch.crawler.addDomainForm.unexpectedValidationErrorMessage',
              { defaultMessage: 'Unexpected error' }
            ),
            state: 'invalid',
          },
          ...failureResultChange,
        });
      }
    },
    startDomainValidation: async () => {
      const { domain, entryPoint } = extractDomainAndEntryPointFromUrl(
        values.addDomainFormInputValue.trim()
      );
      const domainWithProtocol = await getDomainWithProtocol(domain);
      actions.validateDomainInitialVerification(domainWithProtocol, entryPoint);
    },
    submitNewDomain: async () => {
      const { http } = HttpLogic.values;
      const { indexName } = IndexNameLogic.values;

      const requestBody = JSON.stringify({
        entry_points: [{ value: values.entryPointValue }],
        name: values.addDomainFormInputValue.trim(),
      });

      try {
        const response = await http.post<CrawlerDomainFromServer>(
          `/internal/enterprise_search/indices/${indexName}/crawler/domains`,
          {
            body: requestBody,
          }
        );
        const domain = crawlerDomainServerToClient(response);
        actions.onSubmitNewDomainSuccess(domain);
      } catch (e) {
        // we surface errors inside the form instead of in flash messages
        const errorMessages = getErrorsFromHttpResponse(e);
        actions.onSubmitNewDomainError(errorMessages);
      }
    },
    validateDomainContentVerification: () => {
      actions.performDomainValidationStep('contentVerification', ['url_request', 'url_content']);
    },
    validateDomainIndexingRestrictions: () => {
      actions.performDomainValidationStep('indexingRestrictions', ['robots_txt']);
    },
    validateDomainInitialVerification: () => {
      actions.performDomainValidationStep('initialValidation', ['url']);
    },
    validateDomainNetworkConnectivity: () => {
      actions.performDomainValidationStep('networkConnectivity', ['dns', 'tcp']);
    },
  }),
});
