/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { EuiCallOut } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export const NoFieldsCallout = ({
  isAffectedByFieldFilter,
  existFieldsInIndex,
  isAffectedByTimerange = false,
  isAffectedByGlobalFilter = false,
}: {
  isAffectedByFieldFilter: boolean;
  existFieldsInIndex: boolean;
  isAffectedByTimerange?: boolean;
  isAffectedByGlobalFilter?: boolean;
}) => {
  return (
    <EuiCallOut
      size="s"
      color="warning"
      title={
        isAffectedByFieldFilter
          ? i18n.translate('xpack.lens.indexPatterns.noFilteredFieldsLabel', {
              defaultMessage: 'No fields match the selected filters.',
            })
          : existFieldsInIndex
          ? i18n.translate('xpack.lens.indexPatterns.noDataLabel', {
              defaultMessage: `There are no available fields that contain data.`,
            })
          : i18n.translate('xpack.lens.indexPatterns.noFieldsLabel', {
              defaultMessage: 'No fields exist in this index pattern.',
            })
      }
    >
      {existFieldsInIndex && (
        <>
          <strong>
            {i18n.translate('xpack.lens.indexPatterns.noFields.tryText', {
              defaultMessage: 'Try:',
            })}
          </strong>
          <ul>
            {isAffectedByTimerange && (
              <>
                <li>
                  {i18n.translate('xpack.lens.indexPatterns.noFields.extendTimeBullet', {
                    defaultMessage: 'Extending the time range',
                  })}
                </li>
              </>
            )}
            {isAffectedByFieldFilter ? (
              <li>
                {i18n.translate('xpack.lens.indexPatterns.noFields.fieldTypeFilterBullet', {
                  defaultMessage: 'Using different field filters',
                })}
              </li>
            ) : null}
            {isAffectedByGlobalFilter ? (
              <li>
                {i18n.translate('xpack.lens.indexPatterns.noFields.globalFiltersBullet', {
                  defaultMessage: 'Changing the global filters',
                })}
              </li>
            ) : null}
          </ul>
        </>
      )}
    </EuiCallOut>
  );
};
