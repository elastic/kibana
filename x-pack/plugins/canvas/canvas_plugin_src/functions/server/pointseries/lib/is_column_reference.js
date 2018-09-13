import { parse } from 'tinymath';

export function isColumnReference(mathExpression) {
  if (mathExpression == null) mathExpression = 'null';
  const parsedMath = parse(mathExpression);
  return typeof parsedMath === 'string';
}
