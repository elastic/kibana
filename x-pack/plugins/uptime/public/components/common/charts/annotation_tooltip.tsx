/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import moment from 'moment';
import styled from 'styled-components';
import { FormattedMessage } from '@kbn/i18n/react';

const Header = styled.div`
  font-weight: bold;
  padding-left: 4px;
`;

const RecordSeverity = styled.div`
  font-weight: bold;
  border-left: 4px solid ${(props) => props.color};
  padding-left: 2px;
`;

const TimeDiv = styled.div`
  font-weight: 500;
  border-bottom: 1px solid gray;
  padding-bottom: 2px;
`;

export const AnnotationTooltip = ({ details }: { details: string }) => {
  const data = JSON.parse(details);

  function capitalizeFirstLetter(str: string) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  return (
    <>
      <TimeDiv>{moment(data.time).format('lll')}</TimeDiv>
      <Header>
        <FormattedMessage
          id="xpack.uptime.charts.mlAnnotation.header"
          defaultMessage="Score: {score}"
          values={{ score: data.score.toFixed(2) }}
        />
      </Header>
      <RecordSeverity color={data.color}>
        <FormattedMessage
          id="xpack.uptime.charts.mlAnnotation.severity"
          defaultMessage="Severity: {severity}"
          values={{ severity: capitalizeFirstLetter(data.severity) }}
        />
      </RecordSeverity>
    </>
  );
};
