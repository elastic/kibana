/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// THIS IS A PARSER FOR A SUB operations/expression/statement of TinyMath  A-Z, +, -, /, *, (, ), ?, !, &, :, |, >, <, =

interface AggMap {
  [key: string]: any;
}
interface PainlessTinyMathParserProps {
  equation: string;
  aggMap?: AggMap;
}
export class PainlessTinyMathParser {
  private IF = '?';
  private ELSE = ':';
  private AND = '&';
  private OR = '|';
  private NOT_EQUAL = '!=';
  private NOT = '!';
  private openParenthesesRegex = /^\(*/g; // Matches a string that starts with "("
  private notRegex = /^\!/g; // Matches a string that starts with "("
  private closeParenthesesRegex = /\)*$/g; // Matches a string that ends with ")"
  private logicalConditionRegex = /(\s*[|&]{2})/g; // Matches a string that contains "||" or "&&"

  private aggMap = {};
  private equation = '';

  constructor({ equation, aggMap }: PainlessTinyMathParserProps) {
    this.aggMap = aggMap || this.aggMap;
    this.equation = this.clean(equation) || this.equation;
    return this;
  }

  clean(expression: string): string {
    return expression
      .replace(/(\s|\n)/g, '')
      .replace('===', '==')
      .replace('!==', '!=');
  }

  diveIntoString(
    expression: string,
    levelDownChar: string,
    levelUpChar: string
  ): number | undefined {
    // SEARCH FOR THE FIRST ? AND THEN START TO COUNT THE DEPTH
    const expressionLength = expression.length;
    let currentDepth = 0;
    for (let i = expression.indexOf(levelDownChar); i < expressionLength; i++) {
      const char = expression.charAt(i);

      if (char === levelDownChar) {
        currentDepth += 1;
      }
      if (char === levelUpChar) {
        currentDepth -= 1;
      }
      if (currentDepth === 0) {
        return i;
      }
      // IT IS THE LAST CHAR AND THE DEPTH IS NOT 0, SO IT IS INVALID IF ELSE EXPRESSION
      if (i === expressionLength - 1 && currentDepth !== 0) {
        throw new Error('Invalid expression');
      }
    }
  }

  replaceCharactersWithAggMap(inputString: string, aggMap: AggMap): string {
    // Use a regular expression to match any character from 'A' to 'Z'
    const regex = /[A-Z]/g;

    return inputString.replace(regex, (match) => {
      const replacement = aggMap[match]; // Get the replacement from the map
      return replacement ? replacement : match; // Use the replacement or the original character
    });
  }

  parseCondition(condition: string): string {
    // If the condition does not contain any logical operators, return it as it is
    if (
      !condition.includes(this.AND) &&
      !condition.includes(this.OR) &&
      !condition.includes(this.NOT_EQUAL)
    ) {
      return condition;
    }

    const parts = condition.split(this.logicalConditionRegex);
    const filteredParts = parts.filter((part) => part.trim() !== '' || part.includes(this.IF));
    const res = filteredParts.map((part) => {
      // Handle the OR and AND cases and replace them with + and *
      if (part.includes('||')) {
        return part.replace('||', '+').trim();
      }
      if (part.includes('&&')) {
        return part.replace('&&', '*').trim();
      }

      // Handle the NOT and NOT_EQUAL cases and replace them with == and !=
      let isNOT = false;
      if (part.includes(this.NOT)) isNOT = true;
      if (part.includes(this.NOT_EQUAL)) {
        part = part.replace('!=', '==');
      }
      // Strip the part from the parentheses and the NOT characters
      const stripedPart = part
        .replace(this.notRegex, '')
        .replace(this.openParenthesesRegex, '')
        .replace(this.closeParenthesesRegex, '')
        .replace(this.NOT, '')
        .trim();

      // Build the ifelse function and switch the true/false position if it is a NOT case
      // Every condition will be evaluated to 0 or 1 and then we will use the ifelse function to return the correct value
      // example: ifelse(A > 0, 1, 0) example for NOT: ifelse(A > 0, 0, 1)
      let result = `ifelse(${stripedPart},${isNOT ? '0,1' : '1,0'})`;

      const openParentheses = part.match(this.openParenthesesRegex);
      const closeParentheses = part.match(this.closeParenthesesRegex);

      // Ignore parentheses if they are opened and closed in the same condition as we put them using ifelse function
      // Extra parentheses will throw error in Lens
      // We keep the open parentheses and the closing parentheses that are not part of the same condition
      if (
        openParentheses &&
        openParentheses.length > 0 &&
        closeParentheses &&
        closeParentheses.length > 0
      ) {
        return result;
      }
      // Put back the open parentheses
      if (openParentheses && openParentheses.length > 0) {
        result = openParentheses[0] + result;
      }
      // Put back the closing parentheses
      if (closeParentheses && closeParentheses.length > 0) {
        result = result + closeParentheses[0];
      }
      return result;
    });

    // At the end of the loop, we will have an array of conditions with AND(*) and OR(+)
    // And to evaluate the whole condition, by wrapping them with ifelse and check if all the conditions are true (>0)
    const conditions = res.join(' ') + ' > 0';
    return conditions;
  }

  getTrueBranch(expression: string) {
    const lastColonPosition = this.diveIntoString(expression, this.IF, this.ELSE);
    if (lastColonPosition !== undefined) {
      return expression.substring(expression.indexOf(this.IF) + 1, lastColonPosition);
    }
    return '';
  }

  getFalseBrach(expression: string) {
    const lastColonPosition = this.diveIntoString(expression, this.IF, this.ELSE);
    if (lastColonPosition !== undefined) {
      return expression.substring(lastColonPosition + 1);
    }
    return '';
  }

  getCondition(expression: string): string {
    return expression.substring(0, expression.indexOf(this.IF));
  }

  parse(): string {
    const recursiveParseConditions = (expression: string): string => {
      const condition = this.parseCondition(this.getCondition(expression));
      const trueBranch = this.getTrueBranch(expression);
      const falseBranch = this.getFalseBrach(expression);

      let fullCondition = `ifelse(${condition}, ${trueBranch}, ${falseBranch})`;

      if (trueBranch.includes(this.IF)) {
        const parsedTrueBranch = recursiveParseConditions(trueBranch);
        fullCondition = fullCondition.replace(trueBranch, parsedTrueBranch);
      }
      if (falseBranch.includes(this.IF)) {
        const parsedFalseBranch = recursiveParseConditions(falseBranch);
        fullCondition = fullCondition.replace(falseBranch, parsedFalseBranch);
      }
      const result = this.replaceCharactersWithAggMap(fullCondition, this.aggMap);
      return result;
    };

    if (!this.equation || this.equation === '') throw new Error('Invalid Equation');

    if (this.equation.includes(this.IF)) {
      return recursiveParseConditions(this.equation);
    }
    return this.replaceCharactersWithAggMap(this.equation, this.aggMap);
  }
}
