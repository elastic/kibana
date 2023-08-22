/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState, FC } from 'react';
import { RouteComponentProps } from 'react-router-dom';
import { parse } from 'query-string';

import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';

import {
  EuiButtonEmpty,
  EuiCallOut,
  EuiPageContentBody_Deprecated as EuiPageContentBody,
  EuiPageHeader,
  EuiSpacer,
} from '@elastic/eui';
import { isHttpFetchError } from '@kbn/core-http-browser';
import { APP_CREATE_TRANSFORM_CLUSTER_PRIVILEGES } from '../../../../common/constants';
import { TransformConfigUnion } from '../../../../common/types/transform';

import { useGetTransform } from '../../hooks';
import { useDocumentationLinks } from '../../hooks/use_documentation_links';
import { useSearchItems } from '../../hooks/use_search_items';

import { breadcrumbService, docTitleService, BREADCRUMB_SECTION } from '../../services/navigation';
import { PrivilegesWrapper } from '../../lib/authorization';

import { Wizard } from '../create_transform/components/wizard';
import { overrideTransformForCloning } from '../../common/transform';

type Props = RouteComponentProps<{ transformId: string }>;

export const CloneTransformSection: FC<Props> = ({ match, location }) => {
  const { dataViewId }: Record<string, any> = parse(location.search, {
    sort: false,
  });
  // Set breadcrumb and page title
  useEffect(() => {
    breadcrumbService.setBreadcrumbs(BREADCRUMB_SECTION.CLONE_TRANSFORM);
    docTitleService.setTitle('createTransform');
  }, []);

  const { esTransform } = useDocumentationLinks();

  const transformId = match.params.transformId;

  const [transformConfig, setTransformConfig] = useState<TransformConfigUnion>();
  const [errorMessage, setErrorMessage] = useState<string>();
  const [isInitialized, setIsInitialized] = useState(false);
  const { error: searchItemsError, searchItems, setSavedObjectId } = useSearchItems(undefined);

  useEffect(() => {
    if (dataViewId === undefined) {
      setErrorMessage(
        i18n.translate('xpack.transform.clone.fetchErrorPromptText', {
          defaultMessage: 'Could not fetch the Kibana data view ID.',
        })
      );
    } else {
      setSavedObjectId(dataViewId);
    }
  }, [dataViewId, setSavedObjectId]);

  useEffect(() => {
    if (searchItemsError !== undefined) {
      setTransformConfig(undefined);
      setErrorMessage(searchItemsError);
      setIsInitialized(true);
    }
  }, [searchItemsError]);

  const { data: transformConfigs, error } = useGetTransform(
    transformId,
    searchItemsError === undefined
  );

  useEffect(() => {
    if (isHttpFetchError(error) && error.message !== errorMessage) {
      setTransformConfig(undefined);
      setErrorMessage(error.message);
      setIsInitialized(true);
      return;
    }

    if (transformConfigs !== undefined) {
      try {
        setTransformConfig(overrideTransformForCloning(transformConfigs.transforms[0]));
        setErrorMessage(undefined);
        setIsInitialized(true);
      } catch (e) {
        setTransformConfig(undefined);
        if (e.message !== undefined) {
          setErrorMessage(e.message);
        } else {
          setErrorMessage(JSON.stringify(e, null, 2));
        }
        setIsInitialized(true);
      }
    }
  }, [error, errorMessage, transformConfigs]);

  const docsLink = (
    <EuiButtonEmpty
      href={esTransform}
      target="_blank"
      iconType="help"
      data-test-subj="documentationLink"
    >
      <FormattedMessage
        id="xpack.transform.transformsWizard.transformDocsLinkText"
        defaultMessage="Transform docs"
      />
    </EuiButtonEmpty>
  );

  return (
    <PrivilegesWrapper privileges={APP_CREATE_TRANSFORM_CLUSTER_PRIVILEGES}>
      <EuiPageHeader
        pageTitle={
          <FormattedMessage
            id="xpack.transform.transformsWizard.cloneTransformTitle"
            defaultMessage="Clone transform"
          />
        }
        rightSideItems={[docsLink]}
        bottomBorder
      />

      <EuiSpacer size="l" />

      <EuiPageContentBody data-test-subj="transformPageCloneTransform">
        {typeof errorMessage !== 'undefined' && (
          <>
            <EuiCallOut
              title={i18n.translate('xpack.transform.clone.errorPromptTitle', {
                defaultMessage: 'An error occurred getting the transform configuration.',
              })}
              color="danger"
              iconType="warning"
            >
              <pre>{JSON.stringify(errorMessage)}</pre>
            </EuiCallOut>
            <EuiSpacer size="l" />
          </>
        )}
        {searchItems !== undefined && isInitialized === true && transformConfig !== undefined && (
          <Wizard cloneConfig={transformConfig} searchItems={searchItems} />
        )}
      </EuiPageContentBody>
    </PrivilegesWrapper>
  );
};
