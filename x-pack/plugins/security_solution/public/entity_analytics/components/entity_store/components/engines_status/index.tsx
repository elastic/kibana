/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, Fragment } from 'react';
import {
  EuiLoadingSpinner,
  EuiPanel,
  EuiSpacer,
  EuiButtonEmpty,
  EuiFlexItem,
  EuiTitle,
  EuiFlexGroup,
  EuiCallOut,
} from '@elastic/eui';
import { capitalize } from 'lodash/fp';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { useErrorToast } from '../../../../../common/hooks/use_error_toast';
import { downloadBlob } from '../../../../../common/utils/download_blob';
import { useEntityEngineStatusNew } from '../../hooks/use_entity_engine_status';
import { EngineComponentsStatusTable } from './components/engine_components_status';

const FILE_NAME = 'engines_status.json';

export const EngineStatus: React.FC = () => {
  const { data, isLoading, error } = useEntityEngineStatusNew({ withComponents: true });

  const downloadJson = useCallback(() => {
    downloadBlob(new Blob([JSON.stringify(data)]), FILE_NAME);
  }, [data]);

  const errorMessage = i18n.translate(
    'xpack.securitySolution.entityAnalytics.entityStore.enginesStatus.queryError',
    {
      defaultMessage: 'There was an error loading the engine status',
    }
  );

  useErrorToast(errorMessage, error);

  if (error) {
    return <EuiCallOut title={errorMessage} color="danger" iconType="alert" />;
  }

  if (!data || isLoading) return <EuiLoadingSpinner size="xl" />;

  if (data.engines.length === 0) {
    return (
      <FormattedMessage
        id="xpack.securitySolution.entityAnalytics.entityStore.enginesStatus.notFoundMessage"
        defaultMessage="No engines found"
      />
    );
  }

  return (
    <EuiFlexGroup direction="column" gutterSize="none">
      {data?.engines?.length > 0 && (
        <EuiFlexItem grow={false}>
          <EuiFlexGroup justifyContent="flexEnd">
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty size="s" onClick={downloadJson}>
                <FormattedMessage
                  id="xpack.securitySolution.entityAnalytics.entityStore.enginesStatus.downloadButton"
                  defaultMessage="Download status"
                />
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      )}
      <EuiFlexItem>
        {(data?.engines ?? []).map((engine) => (
          <Fragment key={engine.type}>
            <EuiTitle size="s">
              <h4>
                <FormattedMessage
                  id="xpack.securitySolution.entityAnalytics.entityStore.enginesStatus.title"
                  defaultMessage="{type} Store"
                  values={{
                    type: capitalize(engine.type),
                  }}
                />
              </h4>
            </EuiTitle>

            <EuiSpacer size="s" />

            <EuiPanel hasShadow={false} hasBorder={false}>
              {engine.components && <EngineComponentsStatusTable components={engine.components} />}
            </EuiPanel>

            <EuiSpacer size="xl" />
          </Fragment>
        ))}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
