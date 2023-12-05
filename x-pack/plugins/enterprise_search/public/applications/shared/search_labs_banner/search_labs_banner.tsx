/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { css } from '@emotion/react';

import { useValues } from 'kea';

import {
  EuiImage,
  EuiCallOut,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import searchLabsLogo from '../../../assets/images/search_labs_logo.svg';
import { HttpLogic } from '../http';

export const SearchLabsBanner: React.FC = () => {
  const { http } = useValues(HttpLogic);
  const backgroundImagePath = http.basePath.prepend(
    '/plugins/enterpriseSearch/assets/images/search_labs_banner_background.svg'
  );
  return (
    <EuiCallOut
      color="success"
      css={css`
        background-image: url(${backgroundImagePath});
        background-repeat: no-repeat;
      `}
    >
      <EuiImage
        alt={i18n.translate('xpack.enterpriseSearch.shared.searchLabsBanner.logoAltLabel', {
          defaultMessage: 'Elastic Search Labs',
        })}
        src={searchLabsLogo}
        size="original"
      />
      <EuiSpacer size="s" />
      <EuiTitle>
        <h2>
          {i18n.translate('xpack.enterpriseSearch.shared.searchLabsBanner.searchLabsTitle', {
            defaultMessage: 'Get started with vector search and ML',
          })}
        </h2>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiText size="s">
            {i18n.translate(
              'xpack.enterpriseSearch.shared.searchLabsBanner.searchLabsDescription',
              {
                defaultMessage:
                  'Elastic Search Labs contains a range of technical content for building search experiences powered by Elasticsearch’s vector search capabilities and generative AI.  Dive straight into the code with our sample apps and executable Python notebooks.',
              }
            )}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <span>
            <EuiButton
              href="https://www.elastic.co/search-labs/tutorials"
              color="success"
              fill
              target="_blank"
            >
              {i18n.translate('xpack.enterpriseSearch.shared.searchLabsBanner.tutorialsLabel', {
                defaultMessage: 'Tutorials',
              })}
            </EuiButton>
          </span>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <span>
            <EuiButton
              href="https://www.elastic.co/search-labs/tutorials/examples"
              color="success"
              target="_blank"
            >
              {i18n.translate('xpack.enterpriseSearch.shared.searchLabsBanner.notebooksLabel', {
                defaultMessage: 'Notebooks & Examples',
              })}
            </EuiButton>
          </span>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiCallOut>
  );
};
