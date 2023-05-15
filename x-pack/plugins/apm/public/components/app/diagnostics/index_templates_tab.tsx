/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLink, EuiLoadingElastic } from '@elastic/eui';
import {
  EuiBadge,
  EuiBasicTable,
  EuiBasicTableColumn,
  EuiHorizontalRule,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import React from 'react';
import { useApmRouter } from '../../../hooks/use_apm_router';
import { FETCH_STATUS, useFetcher } from '../../../hooks/use_fetcher';
import { APIReturnType } from '../../../services/rest/create_call_apm_api';

type APIResponseType =
  APIReturnType<'GET /internal/apm/diagnostics/index_templates'>;

export function DiagnosticsIndexTemplates() {
  const { data, status } = useFetcher((callApmApi) => {
    return callApmApi(`GET /internal/apm/diagnostics/index_templates`);
  }, []);

  if (status === FETCH_STATUS.LOADING) {
    return <EuiLoadingElastic size="m" />;
  }

  return (
    <>
      <MatchingIndexTemplates data={data} />
      <ExpectedIndexTemplates data={data} />
    </>
  );
}

function MatchingIndexTemplates({
  data,
}: {
  data: APIResponseType | undefined;
}) {
  const router = useApmRouter();
  const indexTemplatesByIndexPattern = data?.matchingIndexTemplates;

  if (
    !indexTemplatesByIndexPattern ||
    indexTemplatesByIndexPattern?.length === 0
  ) {
    return null;
  }

  const elms = indexTemplatesByIndexPattern.map(
    ({ indexPattern, indexTemplates }) => {
      return (
        <>
          <EuiTitle size="xs">
            <h4>{indexPattern}</h4>
          </EuiTitle>

          {!indexTemplates?.length && <em>No matching index templates</em>}

          {indexTemplates?.map(
            ({
              isNonStandard,
              templateName,
              templateIndexPatterns,
              priority,
            }) => {
              return (
                <EuiToolTip
                  content={`${templateIndexPatterns.join(
                    ', '
                  )} (Priority: ${priority})`}
                >
                  <EuiBadge
                    color={isNonStandard ? 'warning' : 'hollow'}
                    css={{ marginRight: '5px', marginTop: '5px' }}
                  >
                    {templateName}
                  </EuiBadge>
                </EuiToolTip>
              );
            }
          )}

          <EuiSpacer />
        </>
      );
    }
  );

  return (
    <>
      <EuiTitle size="m">
        <h2>Index patterns</h2>
      </EuiTitle>

      <EuiText>
        This section lists the index patterns specified in{' '}
        <EuiLink
          data-test-subj="apmMatchingIndexTemplatesSeeDetailsLink"
          href={router.link('/settings/apm-indices')}
        >
          APM Index Settings
        </EuiLink>{' '}
        and which index templates they match. The priority and index pattern of
        each index template can be seen by hovering over the item.
      </EuiText>
      <EuiSpacer />
      {elms}
      <EuiHorizontalRule />
    </>
  );
}

// export function getIndexTemplatesByIndexPattern(
//   data: APIResponseType | undefined
// ) {
//   return data?.matchingIndexTemplates
//     .map(({ indexPattern, overlappingTemplates }) => {
//       const indexTemplates = overlappingTemplates?.map(
//         (overlappingTemplate) => {
//           const expectedIndexTemplates = Object.keys(
//             data.expectedIndexTemplateStates
//           );

//           const defaultXpackIndexTemplates = ['logs', 'metrics'];
//           const templateName = overlappingTemplate.name;
//           const templateIndexPattern =
//             overlappingTemplate.templateIndexPatterns.join(', ');
//           const { priority } = overlappingTemplate;

//           const isNonStandard = [
//             ...expectedIndexTemplates,
//             ...defaultXpackIndexTemplates,
//           ].every((expectedIndexTemplate) => {
//             const notMatch = !templateName.startsWith(expectedIndexTemplate);
//             return notMatch;
//           });

//           return {
//             isNonStandard,
//             templateName,
//             templateIndexPattern,
//             priority,
//           };
//         }
//       );

//       return { indexPattern, indexTemplates };
//     })
//     .filter(({ indexTemplates }) => {
//       return indexTemplates && indexTemplates.length > 0;
//     });
// }

function ExpectedIndexTemplates({
  data,
}: {
  data: APIResponseType | undefined;
}) {
  const items = Object.entries(data?.expectedIndexTemplateStates ?? {}).map(
    ([defaultName, item]) => {
      return {
        ...item,
        defaultName,
      };
    }
  );
  type Item = typeof items[0];

  const columns: Array<EuiBasicTableColumn<Item>> = [
    {
      name: 'Index template name',
      field: 'name',
      render: (_, item) => {
        return item.name || item.defaultName;
      },
      truncateText: true,
    },
    {
      name: 'Exists',
      field: 'exists',
      render: (_, { exists }) => {
        return exists ? (
          <EuiBadge color="green">OK</EuiBadge>
        ) : (
          <EuiBadge color="danger">Not found</EuiBadge>
        );
      },
      truncateText: true,
    },
  ];

  return (
    <>
      <EuiTitle size="m">
        <h2>Index Templates</h2>
      </EuiTitle>

      <EuiText>
        This section lists the names of the default APM Index Templates and
        whether it exists or not
      </EuiText>

      <EuiSpacer />

      <EuiBasicTable
        tableCaption="Expected Index Templates"
        items={items}
        rowHeader="firstName"
        columns={columns}
      />
    </>
  );
}
