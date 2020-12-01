/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow, ShallowWrapper } from 'enzyme';

import { ResultFieldValue } from '.';

describe('ResultFieldValue', () => {
  describe('when no raw or snippet values are provided', () => {
    let wrapper: ShallowWrapper;
    beforeAll(() => {
      wrapper = shallow(<ResultFieldValue type="string" />);
    });

    it('will render a dash', () => {
      expect(wrapper.text()).toEqual('—');
    });
  });

  describe('when there is only a raw value', () => {
    describe('and the value is a string', () => {
      let wrapper: ShallowWrapper;
      beforeAll(() => {
        wrapper = shallow(<ResultFieldValue raw="foo" type="string" />);
      });

      it('will render a display value', () => {
        expect(wrapper.text()).toEqual('foo');
      });

      it('will have the appropriate type class', () => {
        expect(wrapper.prop('className')).toContain('enterpriseSearchDataType--string');
      });
    });

    describe('and the value is a string array', () => {
      let wrapper: ShallowWrapper;
      beforeAll(() => {
        wrapper = shallow(<ResultFieldValue raw={['foo', 'bar']} type="string" />);
      });

      it('will render a display value', () => {
        expect(wrapper.text()).toEqual('["foo", "bar"]');
      });

      it('will have the appropriate type class', () => {
        expect(wrapper.prop('className')).toContain('enterpriseSearchDataType--string');
      });
    });

    describe('and the value is a number', () => {
      let wrapper: ShallowWrapper;
      beforeAll(() => {
        wrapper = shallow(<ResultFieldValue raw={1} type="number" />);
      });

      it('will render a display value', () => {
        expect(wrapper.text()).toEqual('1');
      });

      it('will have the appropriate type class', () => {
        expect(wrapper.prop('className')).toContain('enterpriseSearchDataType--number');
      });
    });

    describe('and the value is an array of numbers', () => {
      let wrapper: ShallowWrapper;
      beforeAll(() => {
        wrapper = shallow(<ResultFieldValue raw={[1, 2]} type="number" />);
      });

      it('will render a display value', () => {
        expect(wrapper.text()).toEqual('[1, 2]');
      });

      it('will have the appropriate type class', () => {
        expect(wrapper.prop('className')).toContain('enterpriseSearchDataType--number');
      });
    });

    describe('and the value is a location', () => {
      let wrapper: ShallowWrapper;
      beforeAll(() => {
        wrapper = shallow(<ResultFieldValue raw={'44.6, -110.5'} type="location" />);
      });

      it('will render a display value', () => {
        expect(wrapper.text()).toEqual('44.6, -110.5');
      });

      it('will have the appropriate type class', () => {
        expect(wrapper.prop('className')).toContain('enterpriseSearchDataType--location');
      });
    });

    describe('and the value is an array of locations', () => {
      let wrapper: ShallowWrapper;
      beforeAll(() => {
        wrapper = shallow(
          <ResultFieldValue raw={['44.6, -110.5', '44.7, -111.0']} type="location" />
        );
      });

      it('will render a display value', () => {
        expect(wrapper.text()).toEqual('[44.6, -110.5, 44.7, -111.0]');
      });

      it('will have the appropriate type class', () => {
        expect(wrapper.prop('className')).toContain('enterpriseSearchDataType--location');
      });
    });

    describe('and the value is a date', () => {
      let wrapper: ShallowWrapper;
      beforeAll(() => {
        wrapper = shallow(<ResultFieldValue raw="1872-03-01T06:00:00Z" type="date" />);
      });

      it('will render a display value', () => {
        expect(wrapper.text()).toEqual('1872-03-01T06:00:00Z');
      });

      it('will have the appropriate type class on outer div', () => {
        expect(wrapper.prop('className')).toContain('enterpriseSearchDataType--date');
      });
    });

    describe('and the value is an array of dates', () => {
      let wrapper: ShallowWrapper;
      beforeAll(() => {
        wrapper = shallow(
          <ResultFieldValue raw={['1872-03-01T06:00:00Z', '1472-04-01T06:00:00Z']} type="date" />
        );
      });

      it('will render a display value', () => {
        expect(wrapper.text()).toEqual('[1872-03-01T06:00:00Z, 1472-04-01T06:00:00Z]');
      });

      it('will have the appropriate type class on outer div', () => {
        expect(wrapper.prop('className')).toContain('enterpriseSearchDataType--date');
      });
    });
  });

  describe('when there is a snippet value', () => {
    let wrapper: ShallowWrapper;
    beforeAll(() => {
      wrapper = shallow(
        <ResultFieldValue
          raw="I am a long description of a thing"
          snippet="a <em>long</em> description"
          type="string"
        />
      );
    });

    it('will render content as html with class names appended to em tags', () => {
      expect(wrapper.find('div').html()).toContain(
        'a <em class="enterpriseSearchResultHighlight">long</em> description'
      );
    });

    it('will have the appropriate type class', () => {
      expect(wrapper.prop('className')).toContain('enterpriseSearchDataType--string');
    });
  });
});
