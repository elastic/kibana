import { compose, withState } from 'recompose';
import { TimeFilter as Component } from './time_filter';

export const TimeFilter = compose(withState('filter', 'setFilter', ({ filter }) => filter))(
  Component
);
