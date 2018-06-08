/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import ace from 'ace';

const { TextHighlightRules } = ace.acequire('ace/mode/text_highlight_rules');
const { JsonHighlightRules } = ace.acequire('ace/mode/json_highlight_rules');

// function rword(parentRule) {
//   const items = [
//     bareword,
//     number
//   ];
//   return items.map(item => Object.assign(item, { next: parentRule }));
// }

export class PipelineHighlightRules extends TextHighlightRules {
  constructor() {
    super();
    console.log(JsonHighlightRules);
    this.$rules = {
      start: [
        // keep this as example of how to enter a string
        // {
        //   token: 'quote',
        //   regex: /\"/,
        //   push: 'doubleQuotedString'
        // },
        // {
        //   token: 'quote',
        //   regex: /\'/,
        //   push: 'singleQuotedString'
        // }
        // {
        //   token: 'name',
        //   regex: /[A-Za-z0-9_]+/,
        //   push: 'attribute'
        // },
        {
          token: ['pipelineSection'],
          regex: /\b^(input|filter|output)\b/,
        },
        {
          token: ['brace'],
          regex: /(\{)/,
          push: 'branchOrPlugin'
        },
        {
          token: 'whitespace',
          regex: /\s+/
        },
        {
          defaultToken: 'error'
        }
      ],
      branchOrPlugin: [
        {
          // TODO: address not highlighting the "if" in "elseif"
          token: 'branch',
          regex: /(\bif\b|else ([\s]+)?if)/,
          next: 'branch'
        },
        {
          token: 'brace',
          regex: /\}/,
          next: 'pop'
        }
      ],
      branch: [
        {
          token: 'brace',
          regex: /\(/,
          next: 'condition'
        },
        {
          token: 'brace',
          regex: /\{/,
        },
        {
          token: 'brace',
          regex: /(\})/,
          next: 'branchOrPlugin'
        }
      ],
      condition: [
        {
          token: 'brace',
          regex: /\)/,
          next: 'branch'
        },
        { include: ['bareword', 'number', 'operator'] }
      ],

      // attribute: [
      //   // this could be any "value", make sure each of those states includes a pop
      //   {
      //     token: 'operator',
      //     regex: /([\s]+)?=>([\s]+)?/,
      //     push: 'attributeValue'
      //   },
      //   {
      //     token: 'operator',
      //     regex: /^$/,
      //     next: 'pop',
      //     onMatch: (a, b, c) => {console.log('matched'); return 'fubar';}
      //   },
      // ],
      // attributeValue: [
      //   {
      //     token: 'attributeValue',
      //     regex: /(end)/,
      //     next: 'pop'
      //   }
      //],
      // hash: [
      //   {
      //     token: 'name',
      //     regex: /[A-Za-z0-9_-]+/,
      //     push: 'hashEntry'
      //   },
      //   {
      //     token: 'brace',
      //     regex: /(\})/
      //   },
      // ],
      // hashEntry: [
      //   {

      //   }
      // ],
      doubleQuotedString: [
        {
          token: 'escapeQuote',
          regex: /\\\"/
        },
        {
          token: 'quote',
          regex: /\"/,
          next: 'pop'
        },
        {
          defaultToken: 'quote'
        }
      ],
      singleQuotedString: [
        {
          token: 'escapeQuote',
          regex: /\\\'/
        },
        {
          token: 'quote',
          regex: /\'/,
          next: 'pop'
        },
        {
          defaultToken: 'quote'
        }
      ],
      bareword: [
        {
          token: ['bareword'],
          regex: /[A-Za-z0-9_]+/
        }
      ],
      number: [
        {
          token: ['number'],
          regex: /[0-9]+(.[0-9]+)?/
        }
      ],
      operator: [
        {
          token: 'operator',
          regex: /==/
        }
      ],

      // branchOrPlugin: [
      //   {
      //     token: ['brace'],
      //     regex: /(\})/,
      //     next: 'start'
      //   },
      //   {
      //     token: ['branch'],
      //     regex: /(if|else(\s+)if)/,
      //     next: 'condition'
      //   },
      //   {
      //     token: ['pluginName'],
      //     regex: /(mutate)/,
      //     next: 'pluginHeading'
      //   },
      // ],
      // condition: [
      //   {
      //     token: ['operator'],
      //     regex: /:/,
      //     next: 'branchOrPlugin'
      //   }
      // ],
      // pluginHeading: [
      //   {
      //     token: ['brace'],
      //     regex: /(\{)/,
      //     next: 'pluginBody'
      //   }
      // ],
      // pluginBody: [
      //   {
      //     token: ['attribute'],
      //     regex: /[A-Za-z0-9_-]+/,
      //     next: 'attribute'
      //   },
      //   {
      //     token: ['brace'],
      //     regex: /(\})/,
      //     next: 'pluginSection'
      //   }
      // ],
      // attribute: [
      //   {
      //     token: ['operator'],
      //     regex: /=>/,
      //   },
      //   {
      //     token: ['boolean'],
      //     regex: /(true|false)/,
      //     next: 'pluginBody'
      //   },
      //   {
      //     token: ['brace'],
      //     regex: /(\{)/,
      //     next: 'hash'
      //   }
      // ],
      // hash: [
      //   {
      //     token: ['attribute'],
      //     regex: /[A-Za-z0-9_-]+/,
      //   },
      //   {
      //     token: ['operator'],
      //     regex: /(=>|:)/
      //   },
      //   {
      //     token: ['brace'],
      //     regex: /(\})/,
      //     next: 'pluginBody'
      //   }
      // ],
    };
    // this.embedRules(JsonHighlightRules, 'json-', [{
    //   token: 'end',
    //   regex: '^```$',
    //   next: 'start',
    // }]);
    this.normalizeRules();
  }
}
//   rule config
//     _ plugin_section _ (_ plugin_section)* _

//   rule comment
//     (whitespace? "#" [^\r\n]* "\r"? "\n")+

//   rule _
//     (comment / whitespace)*

//   rule whitespace
//     [ \t\r\n]+ <LogStash::Compiler::LSCL::AST::Whitespace>
//   end

//   rule plugin_section
//     plugin_type _ "{"
//       _ (branch_or_plugin _)*
//     "}"
//     <LogStash::Compiler::LSCL::AST::PluginSection>
//   end

//   rule branch_or_plugin
//     branch / plugin
//   end

//   rule plugin_type
//     ("input" / "filter" / "output")
//   end

//   rule plugins
//     (plugin (_ plugin)*)?
//     <LogStash::Compiler::LSCL::AST::Plugins>
//   end

//   rule plugin
//     name _ "{"
//       _
//       attributes:( attribute (whitespace _ attribute)*)?
//       _
//     "}"
//     <LogStash::Compiler::LSCL::AST::Plugin>
//   end

//   rule name
//     (
//       ([A-Za-z0-9_-]+ <LogStash::Compiler::LSCL::AST::Name>)
//       / string
//     )
//   end

//   rule attribute
//     name _ "=>" _ value
//     <LogStash::Compiler::LSCL::AST::Attribute>
//   end

//   rule value
//     plugin / bareword / string / number / array / hash
//   end

//   rule array_value
//     bareword / string / number / array / hash
//   end

//   rule bareword
//     [A-Za-z_] [A-Za-z0-9_]+
//     <LogStash::Compiler::LSCL::AST::Bareword>
//   end

//   rule double_quoted_string
//     ( '"' ( '\"' / !'"' . )* '"' <LogStash::Compiler::LSCL::AST::String>)
//   end

//   rule single_quoted_string
//     ( "'" ( "\\'" / !"'" . )* "'" <LogStash::Compiler::LSCL::AST::String>)
//   end

//   rule string
//     double_quoted_string / single_quoted_string
//   end

//   rule regexp
//     ( '/' ( '\/' / !'/' . )* '/'  <LogStash::Compiler::LSCL::AST::RegExp>)
//   end

//   rule number
//     "-"? [0-9]+ ("." [0-9]*)?
//     <LogStash::Compiler::LSCL::AST::Number>
//   end

//   rule array
//     "["
//     _
//     (
//       value (_ "," _ value)*
//     )?
//     _
//     "]"
//     <LogStash::Compiler::LSCL::AST::Array>
//   end

//   rule hash
//     "{"
//       _
//       hashentries?
//       _
//     "}"
//     <LogStash::Compiler::LSCL::AST::Hash>
//   end

//   rule hashentries
//     hashentry (whitespace hashentry)*
//     <LogStash::Compiler::LSCL::AST::HashEntries>
//   end

//   rule hashentry
//     name:(number / bareword / string) _ "=>" _ value
//     <LogStash::Compiler::LSCL::AST::HashEntry>
//   end

//   # Conditions
//   rule branch
//     if (_ else_if)* (_ else)?
//     <LogStash::Compiler::LSCL::AST::Branch>
//   end

//   rule if
//     "if" _ condition _ "{" _ (branch_or_plugin _)* "}"
//     <LogStash::Compiler::LSCL::AST::If>
//   end

//   rule else_if
//     "else" _ "if" _ condition _ "{" _ ( branch_or_plugin _)* "}"
//     <LogStash::Compiler::LSCL::AST::Elsif>
//   end

//   rule else
//     "else" _ "{" _ (branch_or_plugin _)* "}"
//     <LogStash::Compiler::LSCL::AST::Else>
//   end

//   rule condition
//     expression (_ boolean_operator _ expression)*
//     <LogStash::Compiler::LSCL::AST::Condition>
//   end

//   rule expression
//     (
//         ("(" _ condition _ ")")
//       / negative_expression
//       / in_expression
//       / not_in_expression
//       / compare_expression
//       / regexp_expression
//       / rvalue
//     ) <LogStash::Compiler::LSCL::AST::Expression>
//   end

//   rule negative_expression
//     (
//         ("!" _ "(" _ condition _ ")")
//       / ("!" _ selector)
//     ) <LogStash::Compiler::LSCL::AST::NegativeExpression>
//   end

//   rule in_expression
//     rvalue _ in_operator _ rvalue
//     <LogStash::Compiler::LSCL::AST::InExpression>
//   end

//   rule not_in_expression
//     rvalue _ not_in_operator _ rvalue
//     <LogStash::Compiler::LSCL::AST::NotInExpression>
//   end

//   rule in_operator
//     "in"
//   end

//   rule not_in_operator
//     "not " _ "in"
//   end

//   rule rvalue
//     string / number / selector / array / method_call / regexp
//   end

//   rule method_call
//       method _ "(" _
//         (
//           rvalue ( _ "," _ rvalue )*
//         )?
//       _ ")"
//     <LogStash::Compiler::LSCL::AST::MethodCall>
//   end

//   rule method
//     bareword
//   end

//   rule compare_expression
//     rvalue _ compare_operator _ rvalue
//     <LogStash::Compiler::LSCL::AST::ComparisonExpression>
//   end

//   rule compare_operator
//     ("==" / "!=" / "<=" / ">=" / "<" / ">")
//     <LogStash::Compiler::LSCL::AST::ComparisonOperator>
//   end

//   rule regexp_expression
//     rvalue _  regexp_operator _ (string / regexp)
//     <LogStash::Compiler::LSCL::AST::RegexpExpression>
//   end

//   rule regexp_operator
//     ("=~" / "!~") <LogStash::Compiler::LSCL::AST::RegExpOperator>
//   end


//   rule boolean_operator
//     ("and" / "or" / "xor" / "nand")
//     <LogStash::Compiler::LSCL::AST::BooleanOperator>
//   end

//   rule selector
//     selector_element+
//     <LogStash::Compiler::LSCL::AST::Selector>
//   end

//   rule selector_element
//     "[" [^\],]+ "]"
//     <LogStash::Compiler::LSCL::AST::SelectorElement>
//   end
