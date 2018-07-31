/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { last } from 'lodash';
import React from 'react';
import styled from 'styled-components';
import { InfraResponse } from '../../../../common/graphql/types';
import { AutoSizer } from '../../auto_sizer';

interface Props {
  map: InfraResponse;
}

export class WaffleMap extends React.PureComponent<Props> {
  public render() {
    const { map } = this.props;
    const nodes = (map && map.nodes) || [];
    return (
      <AutoSizer bounds>
        {({ measureRef, bounds: { height = 0, width = 0 } }) => (
          <WaffleMapWrapper innerRef={measureRef as any}>
            <svg height={height} width={width} viewBox={`0 0 ${width} ${height}`}>
              <g
                transform={`
                  translate(${width / 2} ${height / 2})
                  translate(-100 -100)
                `}
              >
                <a href="#/details?filter=zone:zone1">
                  <WaffleMapGroupRect x={0} y={0} width={200} height={200} />
                </a>
                {nodes.map((node, index) => {
                  const x = 10 + index * 30;
                  const nodeName = last(node.path).value;
                  const id = node.path.map(n => n.value).join('/');
                  return (
                    <a href={`#/details?filter=beat.hostname:${nodeName}`} key={id}>
                      <WaffleMapLeafRect x={x} y={10} />
                    </a>
                  );
                })}
              </g>
            </svg>
          </WaffleMapWrapper>
        )}
      </AutoSizer>
    );
  }
}

const WaffleMapWrapper = styled.div`
  flex: 1 0 0;
  overflow: hidden;
`;

const WaffleMapGroupRect = styled.rect`
  stroke: ${props => props.theme.eui.euiBorderColor};
  fill: ${props => props.theme.eui.euiColorMediumShade};
  fill-opacity: 0.1;
`;

const WaffleMapLeafRect = styled.rect.attrs({
  height: 20,
  width: 20,
})`
  fill: ${props => props.theme.eui.euiColorVis0};
`;
