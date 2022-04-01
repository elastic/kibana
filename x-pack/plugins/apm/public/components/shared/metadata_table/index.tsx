/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { isEmpty } from 'lodash';
import React, { useCallback } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { EuiLoadingSpinner } from '@elastic/eui';
import { useLegacyUrlParams } from '../../../context/url_params_context/use_url_params';
import { HeightRetainer } from '../height_retainer';
import { fromQuery, toQuery } from '../links/url_helpers';
import { filterSectionsByTerm } from './helper';
import { Section } from './section';
import { useApmPluginContext } from '../../../context/apm_plugin/use_apm_plugin_context';
import { SectionDescriptor } from './types';

interface Props {
  sections: SectionDescriptor[];
  isLoading: boolean;
}

export function MetadataTable({ sections, isLoading }: Props) {
  const history = useHistory();
  const location = useLocation();
  const { urlParams } = useLegacyUrlParams();
  const { searchTerm = '' } = urlParams;
  const { docLinks } = useApmPluginContext().core;

  const filteredSections = filterSectionsByTerm(sections, searchTerm);

  const onSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value.trim().toLowerCase();
      history.replace({
        ...location,
        search: fromQuery({
          ...toQuery(location.search),
          searchTerm: value,
        }),
      });
    },
    [history, location]
  );
  const noResultFound = Boolean(searchTerm) && isEmpty(filteredSections);
  return (
    <React.Fragment>
      <EuiSpacer size="m" />
      <EuiFlexGroup alignItems="center">
        <EuiFlexItem>
          <EuiFieldSearch
            onChange={onSearchChange}
            placeholder={i18n.translate('xpack.apm.searchInput.filter', {
              defaultMessage: 'Filter...',
            })}
            isInvalid={noResultFound}
            value={searchTerm}
            fullWidth={true}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiLink href={docLinks.links.apm.metaData} target="_blank">
            <EuiIcon type="help" /> How to add labels and other data
          </EuiLink>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      {isLoading && (
        <EuiFlexGroup justifyContent="center">
          <EuiFlexItem grow={false}>
            <EuiLoadingSpinner />
          </EuiFlexItem>
        </EuiFlexGroup>
      )}
      <HeightRetainer>
        {filteredSections.map((section) => (
          <div key={section.key}>
            <EuiTitle size="xs">
              <h6>{section.label}</h6>
            </EuiTitle>
            <EuiSpacer size="s" />
            <Section properties={section.properties} />
            <EuiSpacer size="xl" />
          </div>
        ))}
        {noResultFound && <NoResultFound value={searchTerm} />}
      </HeightRetainer>
    </React.Fragment>
  );
}

function NoResultFound({ value }: { value: string }) {
  return (
    <EuiFlexGroup justifyContent="spaceAround">
      <EuiFlexItem grow={false}>
        <EuiText size="s">
          {i18n.translate(
            'xpack.apm.propertiesTable.agentFeature.noResultFound',
            {
              defaultMessage: `No results for "{value}".`,
              values: { value },
            }
          )}
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
