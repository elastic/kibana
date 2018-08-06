/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React from 'react';
import { Provider } from 'react-redux';
import { Store } from 'redux';
import { BehaviorSubject } from 'rxjs';
import { pluck } from 'rxjs/operators';
import styled from 'styled-components';

import { InfraFrontendLibs } from '../../lib/lib';
import { createStore } from './store';

import { AutoSizer } from '../../components/auto_sizer';
import { Toolbar } from '../../components/eui';
import { Header } from '../../components/header';
import { LogCustomizationMenu } from '../../components/logging/log_customization_menu';
import { LogMinimap } from '../../components/logging/log_minimap';
import { LogMinimapScaleControls } from '../../components/logging/log_minimap_scale_controls';
import { LogPositionText } from '../../components/logging/log_position_text';
import { LogSearchControls } from '../../components/logging/log_search_controls';
import { LogStatusbar, LogStatusbarItem } from '../../components/logging/log_statusbar';
import { LogTextScaleControls } from '../../components/logging/log_text_scale_controls';
import { ScrollableLogTextStreamView } from '../../components/logging/log_text_stream';
import { LogTextWrapControls } from '../../components/logging/log_text_wrap_controls';
import { LogTimeControls } from '../../components/logging/log_time_controls';

import { withLibs } from '../../containers/libs';
import { State, targetActions } from '../../containers/logging_legacy/state';
import { withLogSearchControlsProps } from '../../containers/logging_legacy/with_log_search_controls_props';
import { withMinimapProps } from '../../containers/logging_legacy/with_minimap_props';
import { withMinimapScaleControlsProps } from '../../containers/logging_legacy/with_minimap_scale_controls_props';
import { WithStreamItems } from '../../containers/logging_legacy/with_stream_items';
import { WithTextScale } from '../../containers/logging_legacy/with_text_scale_controls_props';
import { WithTextWrap } from '../../containers/logging_legacy/with_text_wrap_controls_props';
import { WithTimeControls } from '../../containers/logging_legacy/with_time_controls_props';
import { withVisibleLogEntries } from '../../containers/logging_legacy/with_visible_log_entries';

const ConnectedLogMinimap = withMinimapProps(LogMinimap);
const ConnectedLogMinimapScaleControls = withMinimapScaleControlsProps(LogMinimapScaleControls);
const ConnectedLogPositionText = withVisibleLogEntries(LogPositionText);
const ConnectedLogSearchControls = withLogSearchControlsProps(LogSearchControls);

interface LogsPageProps {
  libs: InfraFrontendLibs;
}

interface LogsPageState {
  libs: BehaviorSubject<InfraFrontendLibs>;
  store: Store<State>;
}

export const LogsPage = withLibs(
  class LogPage extends React.PureComponent<LogsPageProps, LogsPageState> {
    public state: Readonly<LogsPageState>;

    constructor(props: LogsPageProps) {
      super(props);

      const libs = new BehaviorSubject(props.libs);
      const store = createStore({
        apolloClient: libs.pipe(pluck('apolloClient')),
        observableApi: libs.pipe(pluck('observableApi')),
      });

      this.state = {
        libs,
        store,
      };
    }

    public componentDidUpdate(prevProps: LogsPageProps) {
      if (this.props.libs !== prevProps.libs) {
        this.state.libs.next(this.props.libs);
      }
    }

    public componentDidMount() {
      this.state.store.dispatch(
        targetActions.jumpToTarget({
          time: Date.now(),
          tiebreaker: 0,
        })
      );
    }

    public render() {
      return (
        <Provider store={this.state.store}>
          <ColumnarPage>
            <Header breadcrumbs={[{ text: 'Logs' }]} />
            <Toolbar>
              <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" gutterSize="none">
                <EuiFlexItem>
                  <ConnectedLogPositionText />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <LogCustomizationMenu>
                    <ConnectedLogMinimapScaleControls />
                    <WithTextWrap>
                      {({ wrap, setTextWrap }) => (
                        <LogTextWrapControls wrap={wrap} setTextWrap={setTextWrap} />
                      )}
                    </WithTextWrap>
                    <WithTextScale>
                      {({ availableTextScales, textScale, setTextScale }) => (
                        <LogTextScaleControls
                          availableTextScales={availableTextScales}
                          textScale={textScale}
                          setTextScale={setTextScale}
                        />
                      )}
                    </WithTextScale>
                  </LogCustomizationMenu>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <WithTimeControls>
                    {timeProps => <LogTimeControls {...timeProps} />}
                  </WithTimeControls>
                </EuiFlexItem>
              </EuiFlexGroup>
            </Toolbar>
            <LogPageContent>
              <AutoSizer content>
                {({ measureRef, content: { width = 0, height = 0 } }) => (
                  <LogPageEventStreamColumn innerRef={measureRef as any}>
                    <WithTextScale>
                      {({ textScale }) => (
                        <WithTextWrap>
                          {({ wrap }) => (
                            <WithStreamItems>
                              {streamItemsProps => (
                                <ScrollableLogTextStreamView
                                  scale={textScale}
                                  wrap={wrap}
                                  height={height}
                                  width={width}
                                  {...streamItemsProps}
                                />
                              )}
                            </WithStreamItems>
                          )}
                        </WithTextWrap>
                      )}
                    </WithTextScale>
                  </LogPageEventStreamColumn>
                )}
              </AutoSizer>
              <AutoSizer content>
                {({ measureRef, content: { width = 0, height = 0 } }) => {
                  return (
                    <LogPageMinimapColumn innerRef={measureRef as any}>
                      <ConnectedLogMinimap height={height} width={width} />
                    </LogPageMinimapColumn>
                  );
                }}
              </AutoSizer>
            </LogPageContent>
            <LogStatusbar>
              <LogStatusbarItem>
                <ConnectedLogSearchControls />
              </LogStatusbarItem>
            </LogStatusbar>
          </ColumnarPage>
        </Provider>
      );
    }
  }
);

const LogPageContent = styled.div`
  flex: 1 0 0;
  display: flex;
  flex-direction: row;
  background-color: ${props => props.theme.eui.euiColorEmptyShade};
`;

const LogPageEventStreamColumn = styled.div`
  flex: 1 0 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
`;

const LogPageMinimapColumn = styled.div`
  flex: 1 0 0;
  overflow: hidden;
  min-width: 100px;
  max-width: 100px;
  display: flex;
  flex-direction: column;
`;

const ColumnarPage = styled.div`
  display: flex;
  flex-direction: column;
  align-items: stretch;
  flex: 1 0 0;
`;
