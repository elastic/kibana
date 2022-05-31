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
  EuiPageContentBody,
  EuiPageHeader,
  EuiSpacer,
} from '@elastic/eui';
import { APP_CREATE_TRANSFORM_CLUSTER_PRIVILEGES } from '../../../../common/constants';
import { TransformConfigUnion } from '../../../../common/types/transform';

import { isHttpFetchError } from '../../common/request';
import { useApi } from '../../hooks/use_api';
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

  const api = useApi();

  const { esTransform } = useDocumentationLinks();

  const transformId = match.params.transformId;

  const [transformConfig, setTransformConfig] = useState<TransformConfigUnion>();
  const [errorMessage, setErrorMessage] = useState<string>();
  const [isInitialized, setIsInitialized] = useState(false);
  const { error: searchItemsError, searchItems, setSavedObjectId } = useSearchItems(undefined);

  const fetchTransformConfig = async () => {
    if (searchItemsError !== undefined) {
      setTransformConfig(undefined);
      setErrorMessage(searchItemsError);
      setIsInitialized(true);
      return;
    }

    const transformConfigs = await api.getTransform(transformId);
    if (isHttpFetchError(transformConfigs)) {
      setTransformConfig(undefined);
      setErrorMessage(transformConfigs.message);
      setIsInitialized(true);
      return;
    }

    try {
      if (dataViewId === undefined) {
        throw new Error(
          i18n.translate('xpack.transform.clone.fetchErrorPromptText', {
            defaultMessage: 'Could not fetch the Kibana data view ID.',
          })
        );
      }

      setSavedObjectId(dataViewId);

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
  };

  useEffect(() => {
    fetchTransformConfig();
    // The effect should only be called once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
              iconType="alert"
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
