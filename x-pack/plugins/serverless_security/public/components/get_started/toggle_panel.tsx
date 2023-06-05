/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useReducer } from 'react';
import { EuiEmptyPrompt, EuiFlexGroup, EuiFlexItem, useEuiShadow, useEuiTheme } from '@elastic/eui';

import { css } from '@emotion/react';

import { Switch, TogglePanelAction, TogglePanelId, TogglePanelReducer } from './types';
import * as i18n from './translations';
import { ProductSwitch } from './product_switch';
import { useSetUpCardSections } from './use_setup_cards';

const reducer = (state: TogglePanelReducer, action: TogglePanelAction) => {
  if (action.type === 'toggleSection') {
    if (state.activeSections.has(action.payload.section)) {
      state.activeSections.delete(action.payload.section);
    } else {
      state.activeSections.add(action.payload.section);
    }

    return {
      ...state,
      activeSections: new Set([...state.activeSections]),
    };
  }
  return state;
};

const initialState: TogglePanelReducer = { activeSections: new Set<TogglePanelId>() };

const TogglePanelComponent = () => {
  const { euiTheme } = useEuiTheme();
  const shadow = useEuiShadow('s');

  const [state, dispatch] = useReducer(reducer, initialState);
  const { setUpSections } = useSetUpCardSections({ euiTheme, shadow });
  const sections = setUpSections(state.activeSections);
  const onProductSwitchChanged = useCallback(
    (item: Switch) => {
      dispatch({ type: 'toggleSection', payload: { section: item.id } });
    },
    [dispatch]
  );

  return (
    <EuiFlexGroup gutterSize="none" direction="column">
      <EuiFlexItem grow={false}>
        <ProductSwitch
          onProductSwitchChanged={onProductSwitchChanged}
          activeSections={state.activeSections}
          euiTheme={euiTheme}
          shadow={shadow}
        />
      </EuiFlexItem>
      <EuiFlexItem
        css={css`
          padding: ${euiTheme.size.xs} ${euiTheme.base * 2.25}px;
        `}
        grow={1}
      >
        {state.activeSections.size > 0 ? (
          sections
        ) : (
          <EuiEmptyPrompt
            iconType="magnifyWithExclamation"
            title={<h2>{i18n.TOGGLE_PANEL_EMPTY_TITLE}</h2>}
            body={<p>{i18n.TOGGLE_PANEL_EMPTY_DESCRIPTION}</p>}
            css={css`
              padding: ${euiTheme.base * 5}px 0;
              .euiEmptyPrompt__contentInner {
                max-width: none;
              }
            `}
          />
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

export const TogglePanel = React.memo(TogglePanelComponent);
