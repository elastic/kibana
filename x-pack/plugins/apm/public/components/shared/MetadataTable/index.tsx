/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { isEmpty } from 'lodash';
import React, { useCallback } from 'react';
import { useHistory } from 'react-router-dom';
import { useLocation } from '../../../hooks/useLocation';
import { useUrlParams } from '../../../hooks/useUrlParams';
import { ElasticDocsLink } from '../../shared/Links/ElasticDocsLink';
import { HeightRetainer } from '../HeightRetainer';
import { fromQuery, toQuery } from '../Links/url_helpers';
import { filterSectionsByTerm, SectionsWithRows } from './helper';
import { Section } from './Section';

interface Props {
  sections: SectionsWithRows;
}

export function MetadataTable({ sections }: Props) {
  const history = useHistory();
  const location = useLocation();
  const { urlParams } = useUrlParams();
  const { searchTerm = '' } = urlParams;

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
      <EuiFlexGroup justifyContent="flexEnd" alignItems="center">
        <EuiFlexItem grow={false}>
          <ElasticDocsLink section="/apm/get-started" path="/metadata.html">
            <EuiText size="s">
              <EuiIcon type="help" /> How to add labels and other data
            </EuiText>
          </ElasticDocsLink>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFieldSearch
            onChange={onSearchChange}
            placeholder={i18n.translate('xpack.apm.searchInput.filter', {
              defaultMessage: 'Filter...',
            })}
            style={{
              width: 400,
            }}
            isInvalid={noResultFound}
            value={searchTerm}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <HeightRetainer>
        {filteredSections.map((section) => (
          <div key={section.key}>
            <EuiTitle size="xs">
              <h6>{section.label}</h6>
            </EuiTitle>
            <EuiSpacer size="s" />
            <Section keyValuePairs={section.rows} />
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
