/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import _ from 'lodash';
import { Hint } from 'react-vis';
import moment from 'moment';
import styled from 'styled-components';
import PropTypes from 'prop-types';
import {
  colors,
  unit,
  units,
  px,
  borderRadius,
  fontSize,
  fontSizes
} from '../../../../style/variables';
import Legend from '../Legend';

const TooltipElm = styled.div`
  margin: 0 ${px(unit)};
  transform: translateY(-50%);
  border: 1px solid ${colors.gray4};
  background: ${colors.white};
  border-radius: ${borderRadius};
  font-size: ${fontSize};
  color: ${colors.black};
`;

const Header = styled.div`
  background: ${colors.gray5};
  border-bottom: 1px solid ${colors.gray4};
  border-radius: ${borderRadius} ${borderRadius} 0 0;
  padding: ${px(units.half)};
  color: ${colors.gray3};
`;

const Content = styled.div`
  margin: ${px(units.half)};
  margin-right: ${px(unit)};
  font-size: ${fontSizes.small};
`;

const Footer = styled.div`
  color: ${colors.gray3};
  margin: ${px(units.half)};
  font-size: ${fontSizes.small};
`;

const LegendContainer = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: ${px(units.quarter)};
  justify-content: space-between;
`;

const LegendGray = styled(Legend)`
  color: ${colors.gray3};
`;

const Value = styled.div`
  color: ${colors.gray2};
  font-size: ${fontSize};
`;

export default function Tooltip({
  header,
  footer,
  tooltipPoints,
  x,
  y,
  ...props
}) {
  if (_.isEmpty(tooltipPoints)) {
    return null;
  }

  // Only show legend labels if there is more than 1 data set
  const showLegends = tooltipPoints.length > 1;

  return (
    <Hint {...props} value={{ x, y }}>
      <TooltipElm>
        <Header>{header || moment(x).format('MMMM Do YYYY, HH:mm:ss')}</Header>

        <Content>
          {showLegends ? (
            tooltipPoints.map((point, i) => (
              <LegendContainer key={i}>
                <LegendGray
                  fontSize={fontSize.tiny}
                  radius={units.half}
                  color={point.color}
                  text={point.text}
                />

                <Value>{point.value}</Value>
              </LegendContainer>
            ))
          ) : (
            <Value>{tooltipPoints[0].value}</Value>
          )}
        </Content>
        <Footer>{footer}</Footer>
      </TooltipElm>
    </Hint>
  );
}

Tooltip.propTypes = {
  header: PropTypes.string,
  tooltipPoints: PropTypes.array.isRequired,
  x: PropTypes.number,
  y: PropTypes.number
};

Tooltip.defaultProps = {};
