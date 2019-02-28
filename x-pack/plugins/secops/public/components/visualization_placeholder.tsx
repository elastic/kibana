/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiPanel } from '@elastic/eui';
import { range } from 'lodash/fp';
import * as React from 'react';
import { connect } from 'react-redux';
import { Dispatch } from 'redux';
import styled from 'styled-components';

import { WhoAmI } from '../containers/who_am_i';

import { DragEffects, DraggableWrapper } from './drag_and_drop/draggable_wrapper';
import { mockDataProviders } from './timeline/data_providers/mock/mock_data_providers';
import { Provider } from './timeline/data_providers/provider';

export const VisualizationPlaceholder = styled(EuiPanel)`
  && {
    align-items: center;
    justify-content: center;
    display: flex;
    flex-direction: column;
    margin: 5px;
    padding: 5px 5px 5px 10px;
    width: 500px;
    height: 320px;
    user-select: none;
  }
`;

export const ProviderContainer = styled.div`
  margin: 5px;
  user-select: none;
`;

interface Props {
  count: number;
  myRoute: string;
  dispatch: Dispatch;
}

/** TODO: delete this stub */
class PlaceholdersComponent extends React.PureComponent<Props> {
  public render() {
    const { count, myRoute } = this.props;

    return (
      <>
        {range(0, count).map(i => (
          <VisualizationPlaceholder
            data-test-subj="visualizationPlaceholder"
            key={`visualizationPlaceholder-${i}`}
          >
            <WhoAmI data-test-subj="whoAmI" sourceId="default">
              {() => <div>{myRoute}</div>}
            </WhoAmI>
            <DraggableWrapper
              dataProvider={mockDataProviders[i]}
              render={(dataProvider, _, snapshot) =>
                snapshot.isDragging ? (
                  <DragEffects>
                    <Provider dataProvider={dataProvider} />
                  </DragEffects>
                ) : (
                  mockDataProviders[i].name
                )
              }
            />
          </VisualizationPlaceholder>
        ))}
      </>
    );
  }
}

export const Placeholders = connect()(PlaceholdersComponent);
