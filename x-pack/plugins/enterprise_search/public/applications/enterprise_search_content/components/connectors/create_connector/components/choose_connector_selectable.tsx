/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useState } from 'react';

import { css } from '@emotion/react';

import { useActions, useValues } from 'kea';

import {
  EuiBadge,
  EuiFlexItem,
  EuiIcon,
  EuiInputPopover,
  EuiSelectable,
  EuiSelectableOption,
  useEuiTheme,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { KibanaLogic } from '../../../../../shared/kibana';
import { NewConnectorLogic } from '../../../new_index/method_connector/new_connector_logic';
import { SelfManagePreference } from '../create_connector';

interface ChooseConnectorSelectableProps {
  selfManaged: SelfManagePreference;
}
interface OptionData {
  secondaryContent?: string;
}

export const ChooseConnectorSelectable: React.FC<ChooseConnectorSelectableProps> = ({
  selfManaged,
}) => {
  const { euiTheme } = useEuiTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [selectableOptions, selectableSetOptions] = useState<
    Array<EuiSelectableOption<OptionData>>
  >([]);
  const { connectorTypes } = useValues(KibanaLogic);
  const allConnectors = useMemo(
    () => connectorTypes.sort((a, b) => a.name.localeCompare(b.name)),
    [connectorTypes]
  );
  const { selectedConnector } = useValues(NewConnectorLogic);
  const { setSelectedConnector } = useActions(NewConnectorLogic);

  const getInitialOptions = () => {
    return allConnectors.map((connector, key) => {
      const append: JSX.Element[] = [];
      if (connector.isTechPreview) {
        append.push(
          <EuiBadge key={key + '-preview'} iconType="beaker" color="hollow">
            {i18n.translate(
              'xpack.enterpriseSearch.createConnector.chooseConnectorSelectable.thechPreviewBadgeLabel',
              { defaultMessage: 'Tech preview' }
            )}
          </EuiBadge>
        );
      }
      if (connector.isBeta) {
        append.push(
          <EuiBadge key={key + '-beta'} iconType={'beta'} color="hollow">
            {i18n.translate(
              'xpack.enterpriseSearch.createConnector.chooseConnectorSelectable.BetaBadgeLabel',
              {
                defaultMessage: 'Beta',
              }
            )}
          </EuiBadge>
        );
      }
      if (selfManaged === 'native' && !connector.isNative) {
        append.push(
          <EuiBadge key={key + '-self'} iconType={'warning'} color="warning">
            {i18n.translate(
              'xpack.enterpriseSearch.createConnector.chooseConnectorSelectable.OnlySelfManagedBadgeLabel',
              {
                defaultMessage: 'Self managed',
              }
            )}
          </EuiBadge>
        );
      }

      return {
        append,
        key: key.toString(),
        label: connector.name,
        prepend: <EuiIcon size="l" type={connector.iconPath} />,
      };
    });
  };

  const initialOptions = getInitialOptions();

  useEffect(() => {
    selectableSetOptions(initialOptions);
  }, [selfManaged]);
  const [searchValue, setSearchValue] = useState('');

  return (
    <EuiFlexItem
      css={css`
        position: relative;
      `}
    >
      {selectedConnector?.iconPath && ( // TODO: this is a hack, that shouldn't be merged like this.
        <EuiIcon
          type={selectedConnector.iconPath}
          size="l"
          css={css`
            position: absolute;
            top: 8px;
            left: 10px;
            z-index: 2;
          `}
        />
      )}

      <EuiSelectable
        aria-label={i18n.translate(
          'xpack.enterpriseSearch.createConnector.chooseConnectorSelectable.euiSelectable.selectableInputPopoverLabel',
          { defaultMessage: 'Selectable + input popover example' }
        )}
        css={css`
          .euiFormControlLayoutIcons--left {
            display: ${selectedConnector?.iconPath
              ? 'none'
              : ''}; // TODO this is a hack, that shouldn't be merged like this.
          }
          .euiFieldSearch {
            padding-left: 45px;
          }
        `}
        options={selectableOptions}
        onChange={(newOptions, _, changedOption) => {
          console.log('newOptions', newOptions);
          console.log('changedOption', changedOption);

          selectableSetOptions(newOptions);
          setIsOpen(false);
          if (changedOption.checked === 'on') {
            const keySelected = Number(changedOption.key);
            setSelectedConnector(allConnectors[keySelected]);
            setSearchValue(allConnectors[keySelected].name);
          } else {
            setSelectedConnector(null);
            setSearchValue('');
          }
        }}
        listProps={{
          isVirtualized: true,
          rowHeight: Number(euiTheme.base * 3),
          showIcons: false,
        }}
        singleSelection
        searchable
        searchProps={{
          fullWidth: true,
          isClearable: true,
          onChange: (value) => {
            if (value !== selectedConnector?.name) {
              setSearchValue(value);
            }
          },
          onClick: () => setIsOpen(true), // TODO useCallback
          onFocus: () => setIsOpen(true), // TODO useCallback
          placeholder: i18n.translate(
            'xpack.enterpriseSearch.createConnector.chooseConnectorSelectable.placeholder.text',
            { defaultMessage: 'Choose a data source' }
          ),
          value: searchValue,
        }}
      >
        {(list, search) => (
          <EuiInputPopover
            fullWidth
            closePopover={() => setIsOpen(false)}
            disableFocusTrap
            closeOnScroll
            isOpen={isOpen}
            input={search!}
            panelPaddingSize="none"
          >
            {list}
          </EuiInputPopover>
        )}
      </EuiSelectable>
    </EuiFlexItem>
  );
};
