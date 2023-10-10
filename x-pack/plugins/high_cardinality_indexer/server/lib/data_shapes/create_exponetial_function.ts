import { Moment } from 'moment';
import { Point } from '../../types';

export function createExponentialFunction(start: Point, end: Point) {
  const totalPoints = end.x - start.x;
  const ratio = end.y / start.y;
  const exponent = Math.log(ratio) / (totalPoints - 1);
  return (timestamp: Moment) => {
    const x = timestamp.valueOf() - start.x;
    return start.y * Math.exp(exponent * x);
  };
}

