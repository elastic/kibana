/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useActions, useValues } from 'kea';

import {
  EuiButton,
  EuiPopover,
  EuiContextMenuPanel,
  EuiContextMenuItem,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { APP_SEARCH_PLUGIN } from '../../../../../../../common/constants';
import { KibanaLogic } from '../../../../../shared/kibana';

import { CreateEngineMenuItem } from './create_engine_menu_item';
import { SearchEnginesPopoverLogic } from './search_engines_popover_logic';

export interface SearchEnginesPopoverProps {
  indexName?: string;
  ingestionMethod: string;
  isHiddenIndex?: boolean;
}

export const SearchEnginesPopover: React.FC<SearchEnginesPopoverProps> = ({
  indexName,
  ingestionMethod,
  isHiddenIndex,
}) => {
  const { isSearchEnginesPopoverOpen } = useValues(SearchEnginesPopoverLogic);
  const { toggleSearchEnginesPopover } = useActions(SearchEnginesPopoverLogic);

  return (
    <EuiPopover
      isOpen={isSearchEnginesPopoverOpen}
      closePopover={toggleSearchEnginesPopover}
      button={
        <EuiButton
          data-telemetry-id={`entSearchContent-${ingestionMethod}-header-searchEngines`}
          iconSide="right"
          iconType="arrowDown"
          onClick={toggleSearchEnginesPopover}
        >
          {i18n.translate('xpack.enterpriseSearch.content.index.searchEngines.label', {
            defaultMessage: 'Search engines',
          })}
        </EuiButton>
      }
    >
      <EuiContextMenuPanel
        size="s"
        items={[
          <EuiContextMenuItem
            data-telemetry-id={`entSearchContent-${ingestionMethod}-header-searchEngines-viewEngines`}
            icon="eye"
            onClick={() => {
              KibanaLogic.values.navigateToUrl(APP_SEARCH_PLUGIN.URL, {
                shouldNotCreateHref: true,
              });
            }}
          >
            <EuiText>
              <p>
                {i18n.translate('xpack.enterpriseSearch.content.index.searchEngines.viewEngines', {
                  defaultMessage: 'View App Search engines',
                })}
              </p>
            </EuiText>
          </EuiContextMenuItem>,
          isHiddenIndex ? (
            <EuiToolTip
              content={i18n.translate(
                'xpack.enterpriseSearch.content.index.searchEngines.createEngineDisabledTooltip',
                {
                  defaultMessage: 'You cannot create engines from hidden indices.',
                }
              )}
            >
              <CreateEngineMenuItem
                indexName={indexName}
                ingestionMethod={ingestionMethod}
                isHiddenIndex={isHiddenIndex}
              />
            </EuiToolTip>
          ) : (
            <CreateEngineMenuItem
              indexName={indexName}
              ingestionMethod={ingestionMethod}
              isHiddenIndex={isHiddenIndex}
            />
          ),
        ]}
      />
    </EuiPopover>
  );
};
