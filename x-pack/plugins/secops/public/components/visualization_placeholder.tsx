/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiPanel } from '@elastic/eui';
import { range } from 'lodash/fp';
import * as React from 'react';
import { Draggable, Droppable } from 'react-beautiful-dnd';
import { connect } from 'react-redux';
import { Dispatch } from 'redux';
import styled from 'styled-components';

import { WhoAmI } from '../containers/who_am_i';
import { IdToDataProvider } from './data_provider_context';
import { DataProvider } from './timeline/data_providers/data_provider';
import { mockDataProviders } from './timeline/data_providers/mock/mock_data_providers';

export const VisualizationPlaceholder = styled(EuiPanel)`
  && {
    align-items: center;
    justify-content: center;
    display: flex;
    flex-direction: column;
    margin: 5px;
    padding: 5px 5px 5px 10px;
    width: 500px;
    height: 309px;
    user-select: none;
  }
`;

export const ProviderContainer = styled.div`
  margin: 5px;
  user-select: none;
`;

export const PlaceholdersContainer = styled.div``; // required by react-beautiful-dnd
const ReactDndDropTarget = styled.div``; // required by react-beautiful-dnd

interface Props {
  count: number;
  myRoute: string;
  dispatch: Dispatch;
}

interface GetDraggableIdParams {
  dataProviderId: string;
}
const getDraggableId = ({ dataProviderId }: GetDraggableIdParams): string =>
  `draggableId.provider.${dataProviderId}`;

const getDroppableId = ({
  visualizationPlaceholderId,
}: {
  visualizationPlaceholderId: string;
}): string => `droppableId.provider.${visualizationPlaceholderId}`;

const updateSessionStorage = (dataProvider: DataProvider): void => {
  const oldProviders: IdToDataProvider = JSON.parse(
    sessionStorage.getItem('dataProviders') || '{}'
  ) as IdToDataProvider;

  const newProviders = { ...oldProviders, [dataProvider.id]: dataProvider };
  sessionStorage.setItem('dataProviders', JSON.stringify(newProviders));
};

/** TODO: delete this stub */
class PlaceholdersComponent extends React.PureComponent<Props> {
  public render() {
    const { count, myRoute } = this.props;

    return (
      <PlaceholdersContainer data-test-subj="placeholdersContainer">
        {range(0, count).map(i => (
          <VisualizationPlaceholder
            data-test-subj="visualizationPlaceholder"
            key={`visualizationPlaceholder-${i}`}
          >
            <Droppable droppableId={getDroppableId({ visualizationPlaceholderId: `${i}` })}>
              {droppableProvided => (
                <ReactDndDropTarget
                  innerRef={droppableProvided.innerRef}
                  {...droppableProvided.droppableProps}
                >
                  <WhoAmI data-test-subj="whoAmI" sourceId="default">
                    {({ appName }) => (
                      <div>
                        {appName} {myRoute}
                      </div>
                    )}
                  </WhoAmI>
                  <Draggable
                    draggableId={getDraggableId({ dataProviderId: mockDataProviders[i].id })}
                    index={i}
                    key={mockDataProviders[i].id}
                  >
                    {provided => (
                      <ProviderContainer
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        innerRef={provided.innerRef}
                        data-test-subj="providerContainer"
                      >
                        {updateSessionStorage(mockDataProviders[i])}
                        {mockDataProviders[i].name}
                      </ProviderContainer>
                    )}
                  </Draggable>
                </ReactDndDropTarget>
              )}
            </Droppable>
          </VisualizationPlaceholder>
        ))}
      </PlaceholdersContainer>
    );
  }
}

export const Placeholders = connect()(PlaceholdersComponent);
