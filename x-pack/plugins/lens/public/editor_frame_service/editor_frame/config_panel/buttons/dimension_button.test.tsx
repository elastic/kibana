/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import React from 'react';
import { DimensionButton } from './dimension_button';

describe('DimensionButton', () => {
  function getDefaultProps() {
    return {
      group: {
        groupId: 'groupId',
        accessors: [],
        groupLabel: 'myGroup',
        filterOperations: jest.fn(),
        supportsMoreColumns: false,
      },
      onClick: jest.fn(),
      onRemoveClick: jest.fn(),
      accessorConfig: { columnId: '1' },
      message: undefined,
    };
  }
  it('should fallback to the empty title if the dimension label is made of an empty string', () => {
    render(
      <DimensionButton {...getDefaultProps()} label="">
        <div />
      </DimensionButton>
    );
    expect(screen.getByTitle('Edit [No title] configuration')).toBeInTheDocument();
  });

  it('should fallback to the empty title if the dimension label is made up of whitespaces only', () => {
    render(
      <DimensionButton {...getDefaultProps()} label="     ">
        <div />
      </DimensionButton>
    );
    expect(screen.getByTitle('Edit [No title] configuration')).toBeInTheDocument();
  });

  it('should not fallback to the empty title if the dimension label has also valid chars beside whitespaces', () => {
    render(
      <DimensionButton {...getDefaultProps()} label="aaa     ">
        <div />
      </DimensionButton>
    );
    expect(screen.getByTitle('Edit aaa configuration')).toBeInTheDocument();
  });
});
