import { Moment } from 'moment';
import { Point } from '../../types';

export function createLinearFunction(start: Point, end: Point) {
  const slope = (end.y - start.y) / (end.x - start.x);
  const intercept = start.y - slope * start.x;
  return (timestamp: Moment) => {
    return slope * timestamp.valueOf() + intercept;
  };
}

