import Hbars from 'handlebars/dist/handlebars';
import { evaluate } from 'tinymath';
import { pivotObjectArray } from './pivot_object_array';

// example use: {{math rows 'mean(price - cost)' 2}}
Hbars.registerHelper('math', (rows, expression, precision) => {
  if (!Array.isArray(rows)) return 'MATH ERROR: first argument must be an array';
  const value = evaluate(expression, pivotObjectArray(rows));
  try {
    return precision ? value.toFixed(precision) : value;
  } catch (e) {
    return value;
  }
});

export const Handlebars = Hbars;
