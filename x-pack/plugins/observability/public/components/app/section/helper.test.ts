/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { onBrushEnd } from './helper';
import { History } from 'history';

describe('Chart helper', () => {
  describe('onBrushEnd', () => {
    const history = ({
      push: jest.fn(),
      location: {
        search: '',
      },
    } as unknown) as History;
    it("doesn't push a new history when x is not defined", () => {
      onBrushEnd({ x: undefined, history });
      expect(history.push).not.toBeCalled();
    });

    it('pushes a new history with time range converted to ISO', () => {
      onBrushEnd({ x: [1593409448167, 1593415727797], history });
      expect(history.push).toBeCalledWith({
        search: 'rangeFrom=2020-06-29T05:44:08.167Z&rangeTo=2020-06-29T07:28:47.797Z',
      });
    });

    it('pushes a new history keeping current search', () => {
      history.location.search = '?foo=bar';
      onBrushEnd({ x: [1593409448167, 1593415727797], history });
      expect(history.push).toBeCalledWith({
        search: 'foo=bar&rangeFrom=2020-06-29T05:44:08.167Z&rangeTo=2020-06-29T07:28:47.797Z',
      });
    });
  });
});
