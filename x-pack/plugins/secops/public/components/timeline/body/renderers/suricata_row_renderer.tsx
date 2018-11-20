/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButton } from '@elastic/eui';
import { get } from 'lodash/fp';
import React from 'react';
import styled, { keyframes } from 'styled-components';

import { createLinkWithSignature, RowRenderer } from '.';
import { ECS } from '../../ecs';

const SuricataSignature = styled.div`
  margin-top 10px;
`;

const dropInEffect = keyframes`
  0% {
    border: 1px solid;
    border-color: #d9d9d9;
    transform: scale(1.050);
    box-shadow: 0 2px 2px -1px rgba(153, 153, 153, 0.3), 0 1px 5px -2px rgba(153, 153, 153, 0.3);
  }

  35%, 80% {
    border: 1px solid;
    border-color: #d9d9d9;
    transform: scale(1.010);
    box-shadow: 0 2px 2px -1px rgba(153, 153, 153, 0.3), 0 1px 5px -2px rgba(153, 153, 153, 0.3);
  }

  100% {
    border-color: transparent;
    border-left: 2px solid #8ecce3;
    transform: scale(1);
    box-shadow: unset;
  }
`;

const SuricataRow = styled.div`
  width: 100%;
  background: #f0f8ff;
  border-color: transparent;
  border-left: 2px solid #8ecce3;
  padding-top: 10px;
  padding-bottom: 20px;
  animation: ${dropInEffect} 2s;
  margin-left: -1px;
  transition: 700ms background, 700ms border-color, 1s transform, 1s box-shadow;
  transition-delay: 0s;
  &:hover {
    background: #f0f8ff;
    border: 1px solid;
    border-color: #d9d9d9;
    border-left: 2px solid #8ecce3;
    transform: scale(1.025);
    box-shadow: 0 2px 2px -1px rgba(153, 153, 153, 0.3), 0 1px 5px -2px rgba(153, 153, 153, 0.3);
  }
`;

export const suricataRowRenderer: RowRenderer = {
  isInstance: (ecs: ECS) => {
    if (ecs && ecs.event && ecs.event.module && ecs.event.module.toLowerCase() === 'suricata') {
      return true;
    }
    return false;
  },
  renderRow: (data: ECS, children: React.ReactNode) => {
    const signature = get('suricata.eve.alert.signature', data) as string;
    return (
      <SuricataRow>
        {children}
        {signature != null ? (
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
            }}
          >
            <SuricataSignature>
              <EuiButton fill size="s" href={createLinkWithSignature(signature)}>
                {signature}
              </EuiButton>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  width: '100%',
                  alignItems: 'center',
                }}
              >
                <div
                  style={{
                    marginTop: '5px',
                    fontWeight: 'bold',
                  }}
                >
                  Protocol
                </div>
                <div>TCP</div>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'row',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      margin: '10px 35px 0 0',
                    }}
                  >
                    <div
                      style={{
                        marginTop: '5px',
                        fontWeight: 'bold',
                      }}
                    >
                      Source Host
                    </div>
                    <div>{data.source.ip}</div>
                    <div
                      style={{
                        marginTop: '5px',
                        fontWeight: 'bold',
                      }}
                    >
                      Destination Host
                    </div>
                    <div>{data.destination.ip}</div>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      margin: '10px 20px 0 60px',
                    }}
                  >
                    <div
                      style={{
                        marginTop: '5px',
                        fontWeight: 'bold',
                      }}
                    >
                      Source Port
                    </div>
                    <div>{data.source.port}</div>
                    <div
                      style={{
                        marginTop: '10px',
                        fontWeight: 'bold',
                      }}
                    >
                      Destination Port
                    </div>
                    <div>{data.destination.port}</div>
                  </div>
                </div>
              </div>
            </SuricataSignature>
          </div>
        ) : null}
      </SuricataRow>
    );
  },
};
