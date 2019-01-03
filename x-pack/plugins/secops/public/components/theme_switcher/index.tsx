/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiIcon, EuiSwitch, EuiToolTip } from '@elastic/eui';
import * as React from 'react';
import styled from 'styled-components';
import { ActionCreator } from 'typescript-fsa';

import { defaultTo } from 'lodash/fp';
import { connect } from 'react-redux';
import { pure } from 'recompose';

// @ts-ignore
import { applyTheme } from 'ui/theme';
import { State } from '../../store';
import { appActions, themeSelector } from '../../store/local/app';
import { Theme } from '../../store/local/app/model';

const ThemeSwitcherContainer = styled.div`
  align-items: center;
  display: inline-flex;
  flex-direction: column;
  height: 40px;
  justify-content: space-between;
  margin: 0 10px 0 10px;
`;

interface StateReduxProps {
  currentTheme?: Theme;
}

interface DispatchProps {
  setTheme?: ActionCreator<{
    name: Theme;
  }>;
}

type Props = StateReduxProps & DispatchProps;

/**
 * An accordion that doesn't render it's content unless it's expanded.
 * This component was created because `EuiAccordion`'s eager rendering of
 * accordion content was creating performance issues when used in repeating
 * content on the page.
 *
 * The current implementation actually renders the content *outside* of the
 * actual EuiAccordion when the accordion is expanded! It does this because
 * EuiAccordian applies a `translate` style to the content that causes
 * any draggable content (inside `EuiAccordian`) to have a `translate` style
 * that messes up rendering while the user drags it.
 *
 * TODO: animate the expansion and collapse of content rendered "below"
 * the real `EuiAccordion`.
 */
const ThemeSwitcherComponent = pure<Props>(({ currentTheme, setTheme }) => (
  <EuiToolTip content={currentTheme === 'dark' ? 'Dark Theme' : 'Light Theme'}>
    <ThemeSwitcherContainer data-test-subj="theme-switcher">
      <EuiIcon type="invert" size="m" />
      <EuiSwitch
        aria-label="Toggle"
        data-test-subj="switchButton"
        defaultChecked={currentTheme === 'dark' ? true : false}
        onClick={() => {
          setTheme!({ name: currentTheme === 'dark' ? 'light' : 'dark' });
          applyTheme(currentTheme === 'dark' ? 'light' : 'dark');
        }}
      />
    </ThemeSwitcherContainer>
  </EuiToolTip>
));

const mapStateToProps = (state: State) => ({
  currentTheme: defaultTo('dark', themeSelector(state)),
});

export const ThemeSwitcher = connect(
  mapStateToProps,
  { setTheme: appActions.setTheme }
)(ThemeSwitcherComponent);
