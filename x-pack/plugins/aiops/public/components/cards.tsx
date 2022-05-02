/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';

import { EuiFlexItem, EuiCard } from '@elastic/eui';

import { StreamState } from './stream_reducer';

const imageUrls = {
  Aragorn:
    'https://img.wattpad.com/6df513d8d6a58db43669784e195ce7563099ddc1/68747470733a2f2f73332e616d617a6f6e6177732e636f6d2f776174747061642d6d656469612d736572766963652f53746f7279496d6167652f766235666d474e4c6c6962452d773d3d2d3638363235323432372e313537656331333361343464623164373732363937343435333239372e676966',
  Eowyn:
    'https://img.wattpad.com/dc8cc703540ee83f238e7516d542320dcb57a025/68747470733a2f2f73332e616d617a6f6e6177732e636f6d2f776174747061642d6d656469612d736572766963652f53746f7279496d6167652f335a69435758336f4d7a772d34513d3d2d3239383432363537352e313436616530303235393661353238323232373938313737333337352e676966',
  Frodo: 'https://qph.fs.quoracdn.net/main-qimg-8d65585bb9a4badab1a02e16cfadc466',
  Galadriel:
    'https://64.media.tumblr.com/4f9fde5cc4b34cbbd9d8977790395b80/tumblr_pac1qyUO4M1wc15f6o1_540.gifv',
};

interface CardsProps {
  cards: StreamState['entities'];
}
export const Cards: FC<CardsProps> = ({ cards }) => {
  return (
    <>
      {Object.entries(cards).map(function ([entity, value], index) {
        return (
          <EuiFlexItem key={entity}>
            <EuiCard
              image={
                <div>
                  <img src={imageUrls[entity]} alt="Nature" />
                </div>
              }
              title={entity}
              description={`${entity} killed ${value} orcs.`}
              onClick={() => {}}
            />
          </EuiFlexItem>
        );
      })}
    </>
  );
};

export const CancelCard: FC = () => (
  <EuiFlexItem key={'cancel'}>
    <EuiCard
      image={
        <div>
          <img
            src="https://64.media.tumblr.com/5b633a7ab933c7474a41d4fcde34c665/tumblr_ms58hgSsZw1rq27soo1_500.gifv"
            alt="Nature"
          />
        </div>
      }
      title="Oh no, you gave up!"
      description={`Orcs win.`}
      onClick={() => {}}
    />
  </EuiFlexItem>
);

interface WinCardProps {
  description: string;
}
export const WinCard: FC<WinCardProps> = ({ description }) => (
  <EuiFlexItem key={'win'}>
    <EuiCard
      image={
        <div>
          <img
            src="https://i.pinimg.com/originals/d0/d7/8c/d0d78cb1281c2c2cd7705324debdf621.gif"
            alt="Nature"
          />
        </div>
      }
      title="You win!"
      description={description}
      onClick={() => {}}
    />
  </EuiFlexItem>
);
