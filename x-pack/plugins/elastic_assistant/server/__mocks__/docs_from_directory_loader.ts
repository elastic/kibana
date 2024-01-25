/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Document } from 'langchain/document';

/**
 * Mock LangChain `Document`s from `knowledge_base/esql/documentation`, loaded from a LangChain `DirectoryLoader`
 */
export const mockEsqlDocsFromDirectoryLoader: Document[] = [
  {
    pageContent:
      '[[esql-agg-avg]]\n=== `AVG`\nThe average of a numeric field.\n\n[source.merge.styled,esql]\n----\ninclude::{esql-specs}/stats.csv-spec[tag=avg]\n----\n[%header.monospaced.styled,format=dsv,separator=|]\n|===\ninclude::{esql-specs}/stats.csv-spec[tag=avg-result]\n|===\n\nThe result is always a `double` not matter the input type.\n',
    metadata: {
      source:
        '/Users/andrew.goldstein/Projects/forks/andrew-goldstein/kibana/x-pack/plugins/elastic_assistant/server/knowledge_base/esql/documentation/aggregation_functions/avg.asciidoc',
    },
  },
];

/**
 * Mock LangChain `Document`s from `knowledge_base/esql/language_definition`, loaded from a LangChain `DirectoryLoader`
 */
export const mockEsqlLanguageDocsFromDirectoryLoader: Document[] = [
  {
    pageContent:
      "lexer grammar EsqlBaseLexer;\n\nDISSECT : 'dissect' -> pushMode(EXPRESSION);\nDROP : 'drop' -> pushMode(SOURCE_IDENTIFIERS);\nENRICH : 'enrich' -> pushMode(SOURCE_IDENTIFIERS);\nEVAL : 'eval' -> pushMode(EXPRESSION);\nEXPLAIN : 'explain' -> pushMode(EXPLAIN_MODE);\nFROM : 'from' -> pushMode(SOURCE_IDENTIFIERS);\nGROK : 'grok' -> pushMode(EXPRESSION);\nINLINESTATS : 'inlinestats' -> pushMode(EXPRESSION);\nKEEP : 'keep' -> pushMode(SOURCE_IDENTIFIERS);\nLIMIT : 'limit' -> pushMode(EXPRESSION);\nMV_EXPAND : 'mv_expand' -> pushMode(SOURCE_IDENTIFIERS);\nPROJECT : 'project' -> pushMode(SOURCE_IDENTIFIERS);\nRENAME : 'rename' -> pushMode(SOURCE_IDENTIFIERS);\nROW : 'row' -> pushMode(EXPRESSION);\nSHOW : 'show' -> pushMode(EXPRESSION);\nSORT : 'sort' -> pushMode(EXPRESSION);\nSTATS : 'stats' -> pushMode(EXPRESSION);\nWHERE : 'where' -> pushMode(EXPRESSION);\nUNKNOWN_CMD : ~[ \\r\\n\\t[\\]/]+ -> pushMode(EXPRESSION);\n\nLINE_COMMENT\n    : '//' ~[\\r\\n]* '\\r'? '\\n'? -> channel(HIDDEN)\n    ;\n\nMULTILINE_COMMENT\n    : '/*' (MULTILINE_COMMENT|.)*? '*/' -> channel(HIDDEN)\n    ;\n\nWS\n    : [ \\r\\n\\t]+ -> channel(HIDDEN)\n    ;\n\n\nmode EXPLAIN_MODE;\nEXPLAIN_OPENING_BRACKET : '[' -> type(OPENING_BRACKET), pushMode(DEFAULT_MODE);\nEXPLAIN_PIPE : '|' -> type(PIPE), popMode;\nEXPLAIN_WS : WS -> channel(HIDDEN);\nEXPLAIN_LINE_COMMENT : LINE_COMMENT -> channel(HIDDEN);\nEXPLAIN_MULTILINE_COMMENT : MULTILINE_COMMENT -> channel(HIDDEN);\n\nmode EXPRESSION;\n\nPIPE : '|' -> popMode;\n\nfragment DIGIT\n    : [0-9]\n    ;\n\nfragment LETTER\n    : [A-Za-z]\n    ;\n\nfragment ESCAPE_SEQUENCE\n    : '\\\\' [tnr\"\\\\]\n    ;\n\nfragment UNESCAPED_CHARS\n    : ~[\\r\\n\"\\\\]\n    ;\n\nfragment EXPONENT\n    : [Ee] [+-]? DIGIT+\n    ;\n\nSTRING\n    : '\"' (ESCAPE_SEQUENCE | UNESCAPED_CHARS)* '\"'\n    | '\"\"\"' (~[\\r\\n])*? '\"\"\"' '\"'? '\"'?\n    ;\n\nINTEGER_LITERAL\n    : DIGIT+\n    ;\n\nDECIMAL_LITERAL\n    : DIGIT+ DOT DIGIT*\n    | DOT DIGIT+\n    | DIGIT+ (DOT DIGIT*)? EXPONENT\n    | DOT DIGIT+ EXPONENT\n    ;\n\nBY : 'by';\n\nAND : 'and';\nASC : 'asc';\nASSIGN : '=';\nCOMMA : ',';\nDESC : 'desc';\nDOT : '.';\nFALSE : 'false';\nFIRST : 'first';\nLAST : 'last';\nLP : '(';\nIN: 'in';\nIS: 'is';\nLIKE: 'like';\nNOT : 'not';\nNULL : 'null';\nNULLS : 'nulls';\nOR : 'or';\nPARAM: '?';\nRLIKE: 'rlike';\nRP : ')';\nTRUE : 'true';\nINFO : 'info';\nFUNCTIONS : 'functions';\n\nEQ  : '==';\nNEQ : '!=';\nLT  : '<';\nLTE : '<=';\nGT  : '>';\nGTE : '>=';\n\nPLUS : '+';\nMINUS : '-';\nASTERISK : '*';\nSLASH : '/';\nPERCENT : '%';\n\n// Brackets are funny. We can happen upon a CLOSING_BRACKET in two ways - one\n// way is to start in an explain command which then shifts us to expression\n// mode. Thus, the two popModes on CLOSING_BRACKET. The other way could as\n// the start of a multivalued field constant. To line up with the double pop\n// the explain mode needs, we double push when we see that.\nOPENING_BRACKET : '[' -> pushMode(EXPRESSION), pushMode(EXPRESSION);\nCLOSING_BRACKET : ']' -> popMode, popMode;\n\n\nUNQUOTED_IDENTIFIER\n    : LETTER (LETTER | DIGIT | '_')*\n    // only allow @ at beginning of identifier to keep the option to allow @ as infix operator in the future\n    // also, single `_` and `@` characters are not valid identifiers\n    | ('_' | '@') (LETTER | DIGIT | '_')+\n    ;\n\nQUOTED_IDENTIFIER\n    : '`' ( ~'`' | '``' )* '`'\n    ;\n\nEXPR_LINE_COMMENT\n    : LINE_COMMENT -> channel(HIDDEN)\n    ;\n\nEXPR_MULTILINE_COMMENT\n    : MULTILINE_COMMENT -> channel(HIDDEN)\n    ;\n\nEXPR_WS\n    : WS -> channel(HIDDEN)\n    ;\n\n\n\nmode SOURCE_IDENTIFIERS;\n\nSRC_PIPE : '|' -> type(PIPE), popMode;\nSRC_OPENING_BRACKET : '[' -> type(OPENING_BRACKET), pushMode(SOURCE_IDENTIFIERS), pushMode(SOURCE_IDENTIFIERS);\nSRC_CLOSING_BRACKET : ']' -> popMode, popMode, type(CLOSING_BRACKET);\nSRC_COMMA : ',' -> type(COMMA);\nSRC_ASSIGN : '=' -> type(ASSIGN);\nAS : 'as';\nMETADATA: 'metadata';\nON : 'on';\nWITH : 'with';\n\nSRC_UNQUOTED_IDENTIFIER\n    : SRC_UNQUOTED_IDENTIFIER_PART+\n    ;\n\nfragment SRC_UNQUOTED_IDENTIFIER_PART\n    : ~[=`|,[\\]/ \\t\\r\\n]+\n    | '/' ~[*/] // allow single / but not followed by another / or * which would start a comment\n    ;\n\nSRC_QUOTED_IDENTIFIER\n    : QUOTED_IDENTIFIER\n    ;\n\nSRC_LINE_COMMENT\n    : LINE_COMMENT -> channel(HIDDEN)\n    ;\n\nSRC_MULTILINE_COMMENT\n    : MULTILINE_COMMENT -> channel(HIDDEN)\n    ;\n\nSRC_WS\n    : WS -> channel(HIDDEN)\n    ;\n",
    metadata: {
      source:
        '/Users/andrew.goldstein/Projects/forks/andrew-goldstein/kibana/x-pack/plugins/elastic_assistant/server/knowledge_base/esql/language_definition/esql_base_lexer.g4',
    },
  },
  {
    pageContent:
      "DISSECT=1\nDROP=2\nENRICH=3\nEVAL=4\nEXPLAIN=5\nFROM=6\nGROK=7\nINLINESTATS=8\nKEEP=9\nLIMIT=10\nMV_EXPAND=11\nPROJECT=12\nRENAME=13\nROW=14\nSHOW=15\nSORT=16\nSTATS=17\nWHERE=18\nUNKNOWN_CMD=19\nLINE_COMMENT=20\nMULTILINE_COMMENT=21\nWS=22\nEXPLAIN_WS=23\nEXPLAIN_LINE_COMMENT=24\nEXPLAIN_MULTILINE_COMMENT=25\nPIPE=26\nSTRING=27\nINTEGER_LITERAL=28\nDECIMAL_LITERAL=29\nBY=30\nAND=31\nASC=32\nASSIGN=33\nCOMMA=34\nDESC=35\nDOT=36\nFALSE=37\nFIRST=38\nLAST=39\nLP=40\nIN=41\nIS=42\nLIKE=43\nNOT=44\nNULL=45\nNULLS=46\nOR=47\nPARAM=48\nRLIKE=49\nRP=50\nTRUE=51\nINFO=52\nFUNCTIONS=53\nEQ=54\nNEQ=55\nLT=56\nLTE=57\nGT=58\nGTE=59\nPLUS=60\nMINUS=61\nASTERISK=62\nSLASH=63\nPERCENT=64\nOPENING_BRACKET=65\nCLOSING_BRACKET=66\nUNQUOTED_IDENTIFIER=67\nQUOTED_IDENTIFIER=68\nEXPR_LINE_COMMENT=69\nEXPR_MULTILINE_COMMENT=70\nEXPR_WS=71\nAS=72\nMETADATA=73\nON=74\nWITH=75\nSRC_UNQUOTED_IDENTIFIER=76\nSRC_QUOTED_IDENTIFIER=77\nSRC_LINE_COMMENT=78\nSRC_MULTILINE_COMMENT=79\nSRC_WS=80\nEXPLAIN_PIPE=81\n'dissect'=1\n'drop'=2\n'enrich'=3\n'eval'=4\n'explain'=5\n'from'=6\n'grok'=7\n'inlinestats'=8\n'keep'=9\n'limit'=10\n'mv_expand'=11\n'project'=12\n'rename'=13\n'row'=14\n'show'=15\n'sort'=16\n'stats'=17\n'where'=18\n'by'=30\n'and'=31\n'asc'=32\n'desc'=35\n'.'=36\n'false'=37\n'first'=38\n'last'=39\n'('=40\n'in'=41\n'is'=42\n'like'=43\n'not'=44\n'null'=45\n'nulls'=46\n'or'=47\n'?'=48\n'rlike'=49\n')'=50\n'true'=51\n'info'=52\n'functions'=53\n'=='=54\n'!='=55\n'<'=56\n'<='=57\n'>'=58\n'>='=59\n'+'=60\n'-'=61\n'*'=62\n'/'=63\n'%'=64\n']'=66\n'as'=72\n'metadata'=73\n'on'=74\n'with'=75\n",
    metadata: {
      source:
        '/Users/andrew.goldstein/Projects/forks/andrew-goldstein/kibana/x-pack/plugins/elastic_assistant/server/knowledge_base/esql/language_definition/esql_base_lexer.tokens',
    },
  },
];

/**
 * Mock LangChain `Document`s from `knowledge_base/esql/example_queries`, loaded from a LangChain `DirectoryLoader`
 */
export const mockExampleQueryDocsFromDirectoryLoader: Document[] = [
  {
    pageContent:
      '[[esql-example-queries]]\n\nThe following is an example an ES|QL query:\n\n```\nFROM logs-*\n| WHERE NOT CIDR_MATCH(destination.ip, "10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16")\n| STATS destcount = COUNT(destination.ip) by user.name, host.name\n| ENRICH ldap_lookup_new ON user.name\n| WHERE group.name IS NOT NULL\n| EVAL follow_up = CASE(\n    destcount >= 100, "true",\n     "false")\n| SORT destcount desc\n| KEEP destcount, host.name, user.name, group.name, follow_up\n```\n',
    metadata: {
      source:
        '/Users/andrew.goldstein/Projects/forks/andrew-goldstein/kibana/x-pack/plugins/elastic_assistant/server/knowledge_base/esql/example_queries/esql_example_query_0001.asciidoc',
    },
  },
  {
    pageContent:
      '[[esql-example-queries]]\n\nThe following is an example an ES|QL query:\n\n```\nfrom logs-*\n| grok dns.question.name "%{DATA}\\\\.%{GREEDYDATA:dns.question.registered_domain:string}"\n| stats unique_queries = count_distinct(dns.question.name) by dns.question.registered_domain, process.name\n| where unique_queries > 5\n| sort unique_queries desc\n```\n',
    metadata: {
      source:
        '/Users/andrew.goldstein/Projects/forks/andrew-goldstein/kibana/x-pack/plugins/elastic_assistant/server/knowledge_base/esql/example_queries/esql_example_query_0002.asciidoc',
    },
  },
  {
    pageContent:
      '[[esql-example-queries]]\n\nThe following is an example an ES|QL query:\n\n```\nfrom logs-*\n| where event.code is not null\n| stats event_code_count = count(event.code) by event.code,host.name\n| enrich win_events on event.code with EVENT_DESCRIPTION\n| where EVENT_DESCRIPTION is not null and host.name is not null\n| rename EVENT_DESCRIPTION as event.description\n| sort event_code_count desc\n| keep event_code_count,event.code,host.name,event.description\n```\n',
    metadata: {
      source:
        '/Users/andrew.goldstein/Projects/forks/andrew-goldstein/kibana/x-pack/plugins/elastic_assistant/server/knowledge_base/esql/example_queries/esql_example_query_0003.asciidoc',
    },
  },
];
