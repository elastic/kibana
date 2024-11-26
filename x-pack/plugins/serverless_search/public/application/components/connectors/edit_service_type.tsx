/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React, { useMemo, useCallback } from 'react';
import {
  EuiFlexItem,
  EuiFlexGroup,
  EuiIcon,
  EuiFormRow,
  EuiComboBox,
  EuiBadge,
  EuiComboBoxOptionOption,
  EuiText,
  useEuiTheme,
  EuiTextTruncate,
  EuiBadgeGroup,
} from '@elastic/eui';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Connector as BaseConnector } from '@kbn/search-connectors';
import { css } from '@emotion/react';
import { useAssetBasePath } from '../../hooks/use_asset_base_path';

interface Connector extends BaseConnector {
  iconPath?: string;
}
import { useKibanaServices } from '../../hooks/use_kibana';
import { useConnectorTypes } from '../../hooks/api/use_connector_types';
import { useConnector } from '../../hooks/api/use_connector';

interface EditServiceTypeProps {
  connector: Connector;
  isDisabled?: boolean;
}
interface OptionData {
  secondaryContent?: string;
}

// TODO move these constants to a common file in Serverless as we have in Stack
const BETA_LABEL = i18n.translate('xpack.serverlessSearch.betaLabel', {
  defaultMessage: 'Beta',
});

const TECH_PREVIEW_LABEL = i18n.translate('xpack.serverlessSearch.techPreviewLabel', {
  defaultMessage: 'Tech preview',
});

export const EditServiceType: React.FC<EditServiceTypeProps> = ({ connector, isDisabled }) => {
  const { http } = useKibanaServices();
  const connectorTypes = useConnectorTypes();
  const queryClient = useQueryClient();
  const { queryKey } = useConnector(connector.id);
  const assetBasePath = useAssetBasePath();

  const allConnectors = useMemo(
    () => connectorTypes.sort((a, b) => a.name.localeCompare(b.name)),
    [connectorTypes]
  );

  const { isLoading, mutate } = useMutation({
    mutationFn: async (inputServiceType: string) => {
      const body = { service_type: inputServiceType };
      if (connector.service_type === null || connector.service_type === '') {
        return inputServiceType;
      } else {
        await http.post(`/internal/serverless_search/connectors/${connector.id}/service_type`, {
          body: JSON.stringify(body),
        });
        return inputServiceType;
      }
    },
    onSuccess: (successData) => {
      queryClient.setQueryData(queryKey, {
        connector: { ...connector, service_type: successData },
      });
      queryClient.invalidateQueries(queryKey);
    },
  });

  const getInitialOptions = () => {
    return allConnectors.map((conn, key) => {
      const _append: React.ReactNode[] = [];
      let _ariaLabelAppend = '';
      if (conn.isTechPreview) {
        _append.push(
          <EuiBadge
            aria-label={TECH_PREVIEW_LABEL}
            key={key + '-preview'}
            iconType="beaker"
            color="hollow"
          >
            {i18n.translate(
              'xpack.serverlessSearch.connectors.chooseConnectorSelectable.thechPreviewBadgeLabel',
              { defaultMessage: 'Tech preview' }
            )}
          </EuiBadge>
        );
        _ariaLabelAppend += `, ${TECH_PREVIEW_LABEL}`;
      }
      if (conn.isBeta) {
        _append.push(
          <EuiBadge aria-label={BETA_LABEL} key={key + '-beta'} iconType={'beta'} color="hollow">
            {i18n.translate(
              'xpack.serverlessSearch.connectors.chooseConnectorSelectable.BetaBadgeLabel',
              {
                defaultMessage: 'Beta',
              }
            )}
          </EuiBadge>
        );
        _ariaLabelAppend += `, ${BETA_LABEL}`;
      }
      return {
        _append,
        _prepend: <EuiIcon size="l" type={conn.iconPath} />,
        'aria-label': conn.name + _ariaLabelAppend,
        key: key.toString(),
        label: conn.name,
        serviceType: conn.serviceType,
      };
    });
  };

  const initialOptions = getInitialOptions();
  const { euiTheme } = useEuiTheme();

  const renderOption = (
    option: EuiComboBoxOptionOption<OptionData>,
    searchValue: string,
    contentClassName: string
  ) => {
    const { _append, key, label, _prepend, serviceType } =
      option as EuiComboBoxOptionOption<OptionData> & {
        _append: React.ReactNode[];
        _prepend: React.ReactNode;
        serviceType: string;
      };
    return (
      <EuiFlexGroup
        className={contentClassName}
        key={key + '-span'}
        gutterSize="m"
        responsive={false}
        direction="row"
      >
        <EuiFlexItem grow={false}>{_prepend}</EuiFlexItem>
        <EuiFlexItem
          css={css`
            overflow: auto;
          `}
          grow
          data-test-subj={`serverlessSearchConnectorServiceType-${serviceType}`}
        >
          <EuiText textAlign="left" size="s">
            <EuiTextTruncate text={label} truncation="end" />
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiBadgeGroup gutterSize="xs">{_append}</EuiBadgeGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  };

  const onSelectedOptionChange = useCallback(
    (selectedItem: Array<EuiComboBoxOptionOption<OptionData>>) => {
      if (selectedItem.length === 0) {
        return;
      }
      const keySelected = Number(selectedItem[0].key);
      mutate(allConnectors[keySelected].serviceType);
    },
    [mutate, allConnectors]
  );

  return (
    <EuiFormRow
      label={i18n.translate('xpack.serverlessSearch.connectors.serviceTypeLabel', {
        defaultMessage: 'Connector type',
      })}
      data-test-subj="serverlessSearchEditConnectorType"
      fullWidth
    >
      <EuiComboBox
        aria-label={i18n.translate(
          'xpack.serverlessSearch.connectors.chooseConnectorSelectable.euiComboBox.accessibleScreenReaderLabelLabel',
          { defaultMessage: 'Select a data source for your connector to use.' }
        )}
        // We only want to allow people to set the service type once to avoid weird conflicts
        isDisabled={Boolean(connector.service_type) || isDisabled}
        isLoading={isLoading}
        data-test-subj="serverlessSearchEditConnectorTypeChoices"
        prepend={
          <EuiIcon
            type={
              connector.service_type
                ? connectorTypes.find((conn) => conn.serviceType === connector.service_type)
                    ?.iconPath ?? ''
                : `${assetBasePath}/connectors.svg`
            }
            size="l"
          />
        }
        singleSelection
        fullWidth
        placeholder={i18n.translate(
          'xpack.serverlessSearch.connectors.chooseConnectorSelectable.placeholder.text',
          { defaultMessage: 'Choose a data source' }
        )}
        options={initialOptions}
        selectedOptions={initialOptions
          .filter((option) => option.serviceType === connector.service_type)
          .slice(0, 1)}
        onChange={(selectedItem) => {
          onSelectedOptionChange(selectedItem);
        }}
        renderOption={renderOption}
        rowHeight={(euiTheme.base / 2) * 5}
      />
    </EuiFormRow>
  );
};
