/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const ELSER_PASSAGE_CHUNKED_TWO_INDICES_DOCS = [
  {
    _index: 'workplace_index',
    _id: '248629d8-64d7-4e91-a4eb-dbd8282d9f24',
    _score: 1,
    _ignored: ['metadata.summary.keyword', 'text.keyword'],
    _source: {
      metadata: {
        summary: 'This policy',
        rolePermissions: ['demo', 'manager'],
        name: 'Work From Home Policy',
      },
      vector: {
        tokens: {},
        model_id: '.elser_model_2',
      },
      text: 'Effective: March 2020',
    },
  },
  {
    _index: 'workplace_index2',
    _id: 'b047762c-24eb-4846-aeb5-808346d54c54',
    _score: 1,
    _ignored: ['content.keyword', 'metadata.summary.keyword'],
    _source: {
      metadata: {
        summary:
          'This policy outlines the guidelines for full-time remote work, including eligibility, equipment and resources, workspace requirements, communication expectations, performance expectations, time tracking and overtime, confidentiality and data security, health and well-being, and policy reviews and updates. Employees are encouraged to direct any questions or concerns',
        rolePermissions: ['demo', 'manager'],
        name: 'Work From Home Policy',
      },
      content: 'Effective',
      content_vector: {
        tokens: {},
        model_id: '.elser_model_2',
      },
    },
  },
];

export const DENSE_INPUT_OUTPUT_ONE_INDEX = [
  {
    _index: 'index2',
    _id: 'KQ6Wco8BO787m9kIp1Ug',
    _score: 1,
    _source: {
      text_embedding: [0.03889123350381851],
      text: 'hello there',
      model_id: '.multilingual-e5-small',
    },
  },
];

export const SPARSE_INPUT_OUTPUT_ONE_INDEX = [
  {
    _index: 'index',
    _id: 'Iw6Bco8BO787m9kIa1Wo',
    _score: 1,
    _source: {
      text_embedding: {
        interview: 0.42307013,
      },
      text: 'hello there',
      model_id: '.elser_model_2',
    },
  },
];

export const SPARSE_INPUT_OUTPUT_ONE_INDEX_FIELD_CAPS = {
  indices: ['index'],
  fields: {
    text_embedding: {
      sparse_vector: {
        type: 'sparse_vector',
        metadata_field: false,
        searchable: true,
        aggregatable: false,
      },
    },
    text: {
      text: {
        type: 'text',
        metadata_field: false,
        searchable: true,
        aggregatable: false,
      },
    },
    model_id: {
      text: {
        type: 'text',
        metadata_field: false,
        searchable: true,
        aggregatable: false,
      },
    },
    'model_id.keyword': {
      keyword: {
        type: 'keyword',
        metadata_field: false,
        searchable: true,
        aggregatable: true,
      },
    },
  },
};

export const DENSE_INPUT_OUTPUT_ONE_INDEX_FIELD_CAPS = {
  indices: ['index2'],
  fields: {
    text_embedding: {
      dense_vector: {
        type: 'dense_vector',
        metadata_field: false,
        searchable: true,
        aggregatable: false,
      },
    },
    text: {
      text: {
        type: 'text',
        metadata_field: false,
        searchable: true,
        aggregatable: false,
      },
    },
    model_id: {
      text: {
        type: 'text',
        metadata_field: false,
        searchable: true,
        aggregatable: false,
      },
    },
    'model_id.keyword': {
      keyword: {
        type: 'keyword',
        metadata_field: false,
        searchable: true,
        aggregatable: true,
      },
    },
  },
};

export const DENSE_VECTOR_DOCUMENT_FIRST = [
  {
    _index: 'workplace_index_nested',
    _id: 'MXEeQo4BweykRPD22e0N',
    _score: 1,
    _ignored: ['content.keyword', 'metadata.summary.keyword', 'metadata.content.keyword'],
    _source: {
      metadata: {
        summary:
          'This policy outlines the guidelines for full-time remote work, including eligibility, equipment and resources, workspace requirements, communication expectations, performance expectations, time tracking and overtime, confidentiality and data security, health and well-being, and policy reviews and updates. Employees are encouraged to direct any questions or concerns',
        _run_ml_inference: true,
        updated_at: '2020-03-01',
        created_on: '2020-03-01',
        rolePermissions: ['demo', 'manager'],
        name: 'Work From Home Policy',
        category: 'teams',
        content: `Effective: March 2020
Purpose

The purpose of this full-time work-from-home policy is to provide guidelines and support for employees to conduct their work remotely, ensuring the continuity and productivity of business operations during the COVID-19 pandemic and beyond.
Scope

This policy applies to all employees who are eligible for remote work as determined by their role and responsibilities. It is designed to allow employees to work from home full time while maintaining the same level of performance and collaboration as they would in the office.
Eligibility

Employees who can perform their work duties remotely and have received approval from their direct supervisor and the HR department are eligible for this work-from-home arrangement.
Equipment and Resources

The necessary equipment and resources will be provided to employees for remote work, including a company-issued laptop, software licenses, and access to secure communication tools. Employees are responsible for maintaining and protecting the company's equipment and data.
Workspace

Employees working from home are responsible for creating a comfortable and safe workspace that is conducive to productivity. This includes ensuring that their home office is ergonomically designed, well-lit, and free from distractions.
Communication

Effective communication is vital for successful remote work. Employees are expected to maintain regular communication with their supervisors, colleagues, and team members through email, phone calls, video conferences, and other approved communication tools.
Work Hours and Availability

Employees are expected to maintain their regular work hours and be available during normal business hours, unless otherwise agreed upon with their supervisor. Any changes to work hours or availability must be communicated to the employee's supervisor and the HR department.
Performance Expectations

Employees working from home are expected to maintain the same level of performance and productivity as if they were working in the office. Supervisors and team members will collaborate to establish clear expectations and goals for remote work.
Time Tracking and Overtime

Employees are required to accurately track their work hours using the company's time tracking system. Non-exempt employees must obtain approval from their supervisor before working overtime.
Confidentiality and Data Security

Employees must adhere to the company's confidentiality and data security policies while working from home. This includes safeguarding sensitive information, securing personal devices and internet connections, and reporting any security breaches to the IT department.
Health and Well-being

The company encourages employees to prioritize their health and well-being while working from home. This includes taking regular breaks, maintaining a work-life balance, and seeking support from supervisors and colleagues when needed.
Policy Review and Updates

This work-from-home policy will be reviewed periodically and updated as necessary, taking into account changes in public health guidance, business needs, and employee feedback.
Questions and Concerns

Employees are encouraged to direct any questions or concerns about this policy to their supervisor or the HR department.
`,
        url: './sharepoint/Work from home policy.txt',
      },
      passages: [
        {
          vector: {
            model_id: '.multilingual-e5-small',
          },
          text: 'Effective: March 2020 Purpose',
        },
        {
          vector: {
            model_id: '.multilingual-e5-small',
          },
          text: 'The purpose of this full-time work-from-home policy is to provide guidelines and support for employees to conduct their work remotely, ensuring the continuity and productivity of business operations',
        },
        {
          vector: {
            model_id: '.multilingual-e5-small',
          },
          text: 'of this full-time work-from-home policy is to provide guidelines and support for employees to conduct their work remotely, ensuring the continuity and productivity of business operations during the',
        },
        {
          vector: {
            model_id: '.multilingual-e5-small',
          },
          text: 'full-time work-from-home policy is to provide guidelines and support for employees to conduct their work remotely, ensuring the continuity and productivity of business operations during the COVID-19',
        },
        {
          vector: {
            model_id: '.multilingual-e5-small',
          },
          text: 'work-from-home policy is to provide guidelines and support for employees to conduct their work remotely, ensuring the continuity and productivity of business operations during the COVID-19 pandemic',
        },
        {
          vector: {
            model_id: '.multilingual-e5-small',
          },
          text: 'policy is to provide guidelines and support for employees to conduct their work remotely, ensuring the continuity and productivity of business operations during the COVID-19 pandemic and beyond.',
        },
        {
          vector: {
            model_id: '.multilingual-e5-small',
          },
          text: 'Scope',
        },
        {
          vector: {
            model_id: '.multilingual-e5-small',
          },
          text: 'This policy applies to all employees who are eligible for remote work as determined by their role and responsibilities. It is designed to allow employees to work from home full time while maintaining',
        },
        {
          vector: {
            model_id: '.multilingual-e5-small',
          },
          text: 'policy applies to all employees who are eligible for remote work as determined by their role and responsibilities. It is designed to allow employees to work from home full time while maintaining the',
        },
        {
          vector: {
            model_id: '.multilingual-e5-small',
          },
          text: 'applies to all employees who are eligible for remote work as determined by their role and responsibilities. It is designed to allow employees to work from home full time while maintaining the same',
        },
        {
          vector: {
            model_id: '.multilingual-e5-small',
          },
          text: 'to all employees who are eligible for remote work as determined by their role and responsibilities. It is designed to allow employees to work from home full time while maintaining the same level of',
        },
        {
          vector: {
            model_id: '.multilingual-e5-small',
          },
          text: 'who are eligible for remote work as determined by their role and responsibilities. It is designed to allow employees to work from home full time while maintaining the same level of performance and',
        },
        {
          vector: {
            model_id: '.multilingual-e5-small',
          },
          text: 'for remote work as determined by their role and responsibilities. It is designed to allow employees to work from home full time while maintaining the same level of performance and collaboration as',
        },
        {
          vector: {
            model_id: '.multilingual-e5-small',
          },
          text: 'remote work as determined by their role and responsibilities. It is designed to allow employees to work from home full time while maintaining the same level of performance and collaboration as they',
        },
        {
          vector: {
            model_id: '.multilingual-e5-small',
          },
          text: 'work as determined by their role and responsibilities. It is designed to allow employees to work from home full time while maintaining the same level of performance and collaboration as they would in',
        },
        {
          vector: {
            model_id: '.multilingual-e5-small',
          },
          text: 'as determined by their role and responsibilities. It is designed to allow employees to work from home full time while maintaining the same level of performance and collaboration as they would in the',
        },
        {
          vector: {
            model_id: '.multilingual-e5-small',
          },
          text: 'by their role and responsibilities. It is designed to allow employees to work from home full time while maintaining the same level of performance and collaboration as they would in the office.',
        },
        {
          vector: {
            model_id: '.multilingual-e5-small',
          },
          text: 'Eligibility',
        },
        {
          vector: {
            model_id: '.multilingual-e5-small',
          },
          text: 'Employees who can perform their work duties remotely and have received approval from their direct supervisor and the HR department are eligible for this work-from-home arrangement.',
        },
        {
          vector: {
            model_id: '.multilingual-e5-small',
          },
          text: 'Equipment and Resources',
        },
        {
          vector: {
            model_id: '.multilingual-e5-small',
          },
          text: 'The necessary equipment and resources will be provided to employees for remote work, including a company-issued laptop, software licenses, and access to secure communication tools. Employees are',
        },
        {
          vector: {
            model_id: '.multilingual-e5-small',
          },
          text: 'equipment and resources will be provided to employees for remote work, including a company-issued laptop, software licenses, and access to secure communication tools. Employees are responsible for',
        },
        {
          vector: {
            model_id: '.multilingual-e5-small',
          },
          text: 'and resources will be provided to employees for remote work, including a company-issued laptop, software licenses, and access to secure communication tools. Employees are responsible for maintaining',
        },
        {
          vector: {
            model_id: '.multilingual-e5-small',
          },
          text: 'resources will be provided to employees for remote work, including a company-issued laptop, software licenses, and access to secure communication tools. Employees are responsible for maintaining and',
        },
        {
          vector: {
            model_id: '.multilingual-e5-small',
          },
          text: 'will be provided to employees for remote work, including a company-issued laptop, software licenses, and access to secure communication tools. Employees are responsible for maintaining and protecting',
        },
        {
          vector: {
            model_id: '.multilingual-e5-small',
          },
          text: 'be provided to employees for remote work, including a company-issued laptop, software licenses, and access to secure communication tools. Employees are responsible for maintaining and protecting the',
        },
        {
          vector: {
            model_id: '.multilingual-e5-small',
          },
          text: "to employees for remote work, including a company-issued laptop, software licenses, and access to secure communication tools. Employees are responsible for maintaining and protecting the company's",
        },
        {
          vector: {
            model_id: '.multilingual-e5-small',
          },
          text: "for remote work, including a company-issued laptop, software licenses, and access to secure communication tools. Employees are responsible for maintaining and protecting the company's equipment and",
        },
        {
          vector: {
            model_id: '.multilingual-e5-small',
          },
          text: "remote work, including a company-issued laptop, software licenses, and access to secure communication tools. Employees are responsible for maintaining and protecting the company's equipment and data.",
        },
        {
          vector: {
            model_id: '.multilingual-e5-small',
          },
          text: 'Workspace',
        },
        {
          vector: {
            model_id: '.multilingual-e5-small',
          },
          text: 'Employees working from home are responsible for creating a comfortable and safe workspace that is conducive to productivity. This includes ensuring that their home office is ergonomically designed,',
        },
        {
          vector: {
            model_id: '.multilingual-e5-small',
          },
          text: 'working from home are responsible for creating a comfortable and safe workspace that is conducive to productivity. This includes ensuring that their home office is ergonomically designed, well-lit,',
        },
        {
          vector: {
            model_id: '.multilingual-e5-small',
          },
          text: 'from home are responsible for creating a comfortable and safe workspace that is conducive to productivity. This includes ensuring that their home office is ergonomically designed, well-lit, and free',
        },
        {
          vector: {
            model_id: '.multilingual-e5-small',
          },
          text: 'home are responsible for creating a comfortable and safe workspace that is conducive to productivity. This includes ensuring that their home office is ergonomically designed, well-lit, and free from',
        },
        {
          vector: {
            model_id: '.multilingual-e5-small',
          },
          text: 'for creating a comfortable and safe workspace that is conducive to productivity. This includes ensuring that their home office is ergonomically designed, well-lit, and free from distractions.',
        },
        {
          vector: {
            model_id: '.multilingual-e5-small',
          },
          text: 'Communication',
        },
        {
          vector: {
            model_id: '.multilingual-e5-small',
          },
          text: 'Effective communication is vital for successful remote work. Employees are expected to maintain regular communication with their supervisors, colleagues, and team members through email, phone calls,',
        },
        {
          vector: {
            model_id: '.multilingual-e5-small',
          },
          text: 'communication is vital for successful remote work. Employees are expected to maintain regular communication with their supervisors, colleagues, and team members through email, phone calls, video',
        },
        {
          vector: {
            model_id: '.multilingual-e5-small',
          },
          text: 'is vital for successful remote work. Employees are expected to maintain regular communication with their supervisors, colleagues, and team members through email, phone calls, video conferences, and',
        },
        {
          vector: {
            model_id: '.multilingual-e5-small',
          },
          text: 'for successful remote work. Employees are expected to maintain regular communication with their supervisors, colleagues, and team members through email, phone calls, video conferences, and other',
        },
        {
          vector: {
            model_id: '.multilingual-e5-small',
          },
          text: 'successful remote work. Employees are expected to maintain regular communication with their supervisors, colleagues, and team members through email, phone calls, video conferences, and other approved',
        },
        {
          vector: {
            model_id: '.multilingual-e5-small',
          },
          text: 'work. Employees are expected to maintain regular communication with their supervisors, colleagues, and team members through email, phone calls, video conferences, and other approved communication',
        },
        {
          vector: {
            model_id: '.multilingual-e5-small',
          },
          text: 'Employees are expected to maintain regular communication with their supervisors, colleagues, and team members through email, phone calls, video conferences, and other approved communication tools.',
        },
        {
          vector: {
            model_id: '.multilingual-e5-small',
          },
          text: 'Work Hours and Availability',
        },
        {
          vector: {
            model_id: '.multilingual-e5-small',
          },
          text: 'Employees are expected to maintain their regular work hours and be available during normal business hours, unless otherwise agreed upon with their supervisor. Any changes to work hours or',
        },
        {
          vector: {
            model_id: '.multilingual-e5-small',
          },
          text: 'are expected to maintain their regular work hours and be available during normal business hours, unless otherwise agreed upon with their supervisor. Any changes to work hours or availability must be',
        },
        {
          vector: {
            model_id: '.multilingual-e5-small',
          },
          text: 'to maintain their regular work hours and be available during normal business hours, unless otherwise agreed upon with their supervisor. Any changes to work hours or availability must be communicated',
        },
        {
          vector: {
            model_id: '.multilingual-e5-small',
          },
          text: 'maintain their regular work hours and be available during normal business hours, unless otherwise agreed upon with their supervisor. Any changes to work hours or availability must be communicated to',
        },
        {
          vector: {
            model_id: '.multilingual-e5-small',
          },
          text: 'their regular work hours and be available during normal business hours, unless otherwise agreed upon with their supervisor. Any changes to work hours or availability must be communicated to the',
        },
        {
          vector: {
            model_id: '.multilingual-e5-small',
          },
          text: "regular work hours and be available during normal business hours, unless otherwise agreed upon with their supervisor. Any changes to work hours or availability must be communicated to the employee's",
        },
        {
          vector: {
            model_id: '.multilingual-e5-small',
          },
          text: "hours and be available during normal business hours, unless otherwise agreed upon with their supervisor. Any changes to work hours or availability must be communicated to the employee's supervisor",
        },
        {
          vector: {
            model_id: '.multilingual-e5-small',
          },
          text: "and be available during normal business hours, unless otherwise agreed upon with their supervisor. Any changes to work hours or availability must be communicated to the employee's supervisor and the",
        },
        {
          vector: {
            model_id: '.multilingual-e5-small',
          },
          text: "be available during normal business hours, unless otherwise agreed upon with their supervisor. Any changes to work hours or availability must be communicated to the employee's supervisor and the HR",
        },
        {
          vector: {
            model_id: '.multilingual-e5-small',
          },
          text: "during normal business hours, unless otherwise agreed upon with their supervisor. Any changes to work hours or availability must be communicated to the employee's supervisor and the HR department.",
        },
        {
          vector: {
            model_id: '.multilingual-e5-small',
          },
          text: 'Performance Expectations',
        },
        {
          vector: {
            model_id: '.multilingual-e5-small',
          },
          text: 'Employees working from home are expected to maintain the same level of performance and productivity as if they were working in the office. Supervisors and team members will collaborate to establish',
        },
        {
          vector: {
            model_id: '.multilingual-e5-small',
          },
          text: 'working from home are expected to maintain the same level of performance and productivity as if they were working in the office. Supervisors and team members will collaborate to establish clear',
        },
        {
          vector: {
            model_id: '.multilingual-e5-small',
          },
          text: 'from home are expected to maintain the same level of performance and productivity as if they were working in the office. Supervisors and team members will collaborate to establish clear expectations',
        },
        {
          vector: {
            model_id: '.multilingual-e5-small',
          },
          text: 'home are expected to maintain the same level of performance and productivity as if they were working in the office. Supervisors and team members will collaborate to establish clear expectations and',
        },
        {
          vector: {
            model_id: '.multilingual-e5-small',
          },
          text: 'are expected to maintain the same level of performance and productivity as if they were working in the office. Supervisors and team members will collaborate to establish clear expectations and goals',
        },
        {
          vector: {
            model_id: '.multilingual-e5-small',
          },
          text: 'expected to maintain the same level of performance and productivity as if they were working in the office. Supervisors and team members will collaborate to establish clear expectations and goals for',
        },
        {
          vector: {
            model_id: '.multilingual-e5-small',
          },
          text: 'to maintain the same level of performance and productivity as if they were working in the office. Supervisors and team members will collaborate to establish clear expectations and goals for remote',
        },
        {
          vector: {
            model_id: '.multilingual-e5-small',
          },
          text: 'maintain the same level of performance and productivity as if they were working in the office. Supervisors and team members will collaborate to establish clear expectations and goals for remote work.',
        },
        {
          vector: {
            model_id: '.multilingual-e5-small',
          },
          text: 'Time Tracking and Overtime',
        },
        {
          vector: {
            model_id: '.multilingual-e5-small',
          },
          text: "Employees are required to accurately track their work hours using the company's time tracking system. Non-exempt employees must obtain approval from their supervisor before working overtime.",
        },
        {
          vector: {
            model_id: '.multilingual-e5-small',
          },
          text: 'Confidentiality and Data Security',
        },
        {
          vector: {
            model_id: '.multilingual-e5-small',
          },
          text: "Employees must adhere to the company's confidentiality and data security policies while working from home. This includes safeguarding sensitive information, securing personal devices and internet",
        },
        {
          vector: {
            model_id: '.multilingual-e5-small',
          },
          text: "must adhere to the company's confidentiality and data security policies while working from home. This includes safeguarding sensitive information, securing personal devices and internet connections,",
        },
        {
          vector: {
            model_id: '.multilingual-e5-small',
          },
          text: "adhere to the company's confidentiality and data security policies while working from home. This includes safeguarding sensitive information, securing personal devices and internet connections, and",
        },
        {
          vector: {
            model_id: '.multilingual-e5-small',
          },
          text: "the company's confidentiality and data security policies while working from home. This includes safeguarding sensitive information, securing personal devices and internet connections, and reporting",
        },
        {
          vector: {
            model_id: '.multilingual-e5-small',
          },
          text: "company's confidentiality and data security policies while working from home. This includes safeguarding sensitive information, securing personal devices and internet connections, and reporting any",
        },
        {
          vector: {
            model_id: '.multilingual-e5-small',
          },
          text: 'confidentiality and data security policies while working from home. This includes safeguarding sensitive information, securing personal devices and internet connections, and reporting any security',
        },
        {
          vector: {
            model_id: '.multilingual-e5-small',
          },
          text: 'and data security policies while working from home. This includes safeguarding sensitive information, securing personal devices and internet connections, and reporting any security breaches to the IT',
        },
        {
          vector: {
            model_id: '.multilingual-e5-small',
          },
          text: 'policies while working from home. This includes safeguarding sensitive information, securing personal devices and internet connections, and reporting any security breaches to the IT department.',
        },
        {
          vector: {
            model_id: '.multilingual-e5-small',
          },
          text: 'Health and Well-being',
        },
        {
          vector: {
            model_id: '.multilingual-e5-small',
          },
          text: 'The company encourages employees to prioritize their health and well-being while working from home. This includes taking regular breaks, maintaining a work-life balance, and seeking support from',
        },
        {
          vector: {
            model_id: '.multilingual-e5-small',
          },
          text: 'encourages employees to prioritize their health and well-being while working from home. This includes taking regular breaks, maintaining a work-life balance, and seeking support from supervisors and',
        },
        {
          vector: {
            model_id: '.multilingual-e5-small',
          },
          text: 'employees to prioritize their health and well-being while working from home. This includes taking regular breaks, maintaining a work-life balance, and seeking support from supervisors and colleagues',
        },
        {
          vector: {
            model_id: '.multilingual-e5-small',
          },
          text: 'to prioritize their health and well-being while working from home. This includes taking regular breaks, maintaining a work-life balance, and seeking support from supervisors and colleagues when',
        },
        {
          vector: {
            model_id: '.multilingual-e5-small',
          },
          text: 'prioritize their health and well-being while working from home. This includes taking regular breaks, maintaining a work-life balance, and seeking support from supervisors and colleagues when needed.',
        },
        {
          vector: {
            model_id: '.multilingual-e5-small',
          },
          text: 'Policy Review and Updates',
        },
        {
          vector: {
            model_id: '.multilingual-e5-small',
          },
          text: 'This work-from-home policy will be reviewed periodically and updated as necessary, taking into account changes in public health guidance, business needs, and employee feedback.',
        },
        {
          vector: {
            model_id: '.multilingual-e5-small',
          },
          text: `This work-from-home policy will be reviewed periodically and updated as necessary, taking into account changes in public health guidance, business needs, and employee feedback.
Questions and Concerns`,
        },
        {
          vector: {
            model_id: '.multilingual-e5-small',
          },
          text: 'Employees are encouraged to direct any questions or concerns about this policy to their supervisor or the HR department.',
        },
      ],
    },
  },
];

export const DENSE_VECTOR_DOCUMENT_FIRST_FIELD_CAPS = {
  indices: ['workplace_index_nested'],
  fields: {
    'passages.vector.model_id.keyword': {
      keyword: {
        type: 'keyword',
        metadata_field: false,
        searchable: true,
        aggregatable: true,
      },
    },
    metadata: {
      object: {
        type: 'object',
        metadata_field: false,
        searchable: false,
        aggregatable: false,
      },
    },
    'passages.vector.predicted_value': {
      dense_vector: {
        type: 'dense_vector',
        metadata_field: false,
        searchable: true,
        aggregatable: false,
      },
    },
    'metadata.category': {
      text: {
        type: 'text',
        metadata_field: false,
        searchable: true,
        aggregatable: false,
      },
    },
    content: {
      text: {
        type: 'text',
        metadata_field: false,
        searchable: true,
        aggregatable: false,
      },
    },
    'metadata.url': {
      text: {
        type: 'text',
        metadata_field: false,
        searchable: true,
        aggregatable: false,
      },
    },
    'metadata.summary.keyword': {
      keyword: {
        type: 'keyword',
        metadata_field: false,
        searchable: true,
        aggregatable: true,
      },
    },
    'metadata.updated_at': {
      date: {
        type: 'date',
        metadata_field: false,
        searchable: true,
        aggregatable: true,
      },
    },
    'metadata.rolePermissions': {
      text: {
        type: 'text',
        metadata_field: false,
        searchable: true,
        aggregatable: false,
      },
    },
    passages: {
      nested: {
        type: 'nested',
        metadata_field: false,
        searchable: false,
        aggregatable: false,
      },
    },
    'metadata.name': {
      text: {
        type: 'text',
        metadata_field: false,
        searchable: true,
        aggregatable: false,
      },
    },
    'metadata._run_ml_inference': {
      boolean: {
        type: 'boolean',
        metadata_field: false,
        searchable: true,
        aggregatable: true,
      },
    },
    'metadata.url.keyword': {
      keyword: {
        type: 'keyword',
        metadata_field: false,
        searchable: true,
        aggregatable: true,
      },
    },
    'passages.text': {
      text: {
        type: 'text',
        metadata_field: false,
        searchable: true,
        aggregatable: false,
      },
    },
    'metadata.category.keyword': {
      keyword: {
        type: 'keyword',
        metadata_field: false,
        searchable: true,
        aggregatable: true,
      },
    },
    'metadata.rolePermissions.keyword': {
      keyword: {
        type: 'keyword',
        metadata_field: false,
        searchable: true,
        aggregatable: true,
      },
    },
    'metadata.name.keyword': {
      keyword: {
        type: 'keyword',
        metadata_field: false,
        searchable: true,
        aggregatable: true,
      },
    },
    'metadata.summary': {
      text: {
        type: 'text',
        metadata_field: false,
        searchable: true,
        aggregatable: false,
      },
    },
    'passages.vector': {
      object: {
        type: 'object',
        metadata_field: false,
        searchable: false,
        aggregatable: false,
      },
    },
    'metadata.restricted': {
      boolean: {
        type: 'boolean',
        metadata_field: false,
        searchable: true,
        aggregatable: true,
      },
    },
    'content.keyword': {
      keyword: {
        type: 'keyword',
        metadata_field: false,
        searchable: true,
        aggregatable: true,
      },
    },
    'passages.vector.model_id': {
      text: {
        type: 'text',
        metadata_field: false,
        searchable: true,
        aggregatable: false,
      },
    },
    'metadata.created_on': {
      date: {
        type: 'date',
        metadata_field: false,
        searchable: true,
        aggregatable: true,
      },
    },
    'metadata.content.keyword': {
      keyword: {
        type: 'keyword',
        metadata_field: false,
        searchable: true,
        aggregatable: true,
      },
    },
    'metadata.content': {
      text: {
        type: 'text',
        metadata_field: false,
        searchable: true,
        aggregatable: false,
      },
    },
    'passages.text.keyword': {
      keyword: {
        type: 'keyword',
        metadata_field: false,
        searchable: true,
        aggregatable: true,
      },
    },
  },
};

export const ELSER_PASSAGE_CHUNKED_TWO_INDICES = {
  indices: ['workplace_index', 'workplace_index2'],
  fields: {
    'vector.tokens': {
      rank_features: {
        type: 'rank_features',
        metadata_field: false,
        searchable: true,
        aggregatable: false,
        indices: ['workplace_index'],
      },
      unmapped: {
        type: 'unmapped',
        metadata_field: false,
        searchable: false,
        aggregatable: false,
        indices: ['workplace_index2'],
      },
    },
    metadata: {
      object: {
        type: 'object',
        metadata_field: false,
        searchable: false,
        aggregatable: false,
      },
    },
    'metadata.rolePermissions.keyword': {
      keyword: {
        type: 'keyword',
        metadata_field: false,
        searchable: true,
        aggregatable: true,
      },
    },
    'metadata.name.keyword': {
      keyword: {
        type: 'keyword',
        metadata_field: false,
        searchable: true,
        aggregatable: true,
      },
    },
    'metadata.summary': {
      text: {
        type: 'text',
        metadata_field: false,
        searchable: true,
        aggregatable: false,
      },
    },
    'content_vector.tokens': {
      rank_features: {
        type: 'rank_features',
        metadata_field: false,
        searchable: true,
        aggregatable: false,
        indices: ['workplace_index2'],
      },
      unmapped: {
        type: 'unmapped',
        metadata_field: false,
        searchable: false,
        aggregatable: false,
        indices: ['workplace_index'],
      },
    },
    content: {
      unmapped: {
        type: 'unmapped',
        metadata_field: false,
        searchable: false,
        aggregatable: false,
        indices: ['workplace_index'],
      },
      text: {
        type: 'text',
        metadata_field: false,
        searchable: true,
        aggregatable: false,
        indices: ['workplace_index2'],
      },
    },
    'vector.model_id': {
      unmapped: {
        type: 'unmapped',
        metadata_field: false,
        searchable: false,
        aggregatable: false,
        indices: ['workplace_index2'],
      },
      text: {
        type: 'text',
        metadata_field: false,
        searchable: true,
        aggregatable: false,
        indices: ['workplace_index'],
      },
    },
    'content.keyword': {
      keyword: {
        type: 'keyword',
        metadata_field: false,
        searchable: true,
        aggregatable: true,
        indices: ['workplace_index2'],
      },
      unmapped: {
        type: 'unmapped',
        metadata_field: false,
        searchable: false,
        aggregatable: false,
        indices: ['workplace_index'],
      },
    },
    'content_vector.model_id.keyword': {
      keyword: {
        type: 'keyword',
        metadata_field: false,
        searchable: true,
        aggregatable: true,
        indices: ['workplace_index2'],
      },
      unmapped: {
        type: 'unmapped',
        metadata_field: false,
        searchable: false,
        aggregatable: false,
        indices: ['workplace_index'],
      },
    },
    'metadata.summary.keyword': {
      keyword: {
        type: 'keyword',
        metadata_field: false,
        searchable: true,
        aggregatable: true,
      },
    },
    'vector.model_id.keyword': {
      keyword: {
        type: 'keyword',
        metadata_field: false,
        searchable: true,
        aggregatable: true,
        indices: ['workplace_index'],
      },
      unmapped: {
        type: 'unmapped',
        metadata_field: false,
        searchable: false,
        aggregatable: false,
        indices: ['workplace_index2'],
      },
    },
    content_vector: {
      unmapped: {
        type: 'unmapped',
        metadata_field: false,
        searchable: false,
        aggregatable: false,
        indices: ['workplace_index'],
      },
      object: {
        type: 'object',
        metadata_field: false,
        searchable: false,
        aggregatable: false,
        indices: ['workplace_index2'],
      },
    },
    'metadata.rolePermissions': {
      text: {
        type: 'text',
        metadata_field: false,
        searchable: true,
        aggregatable: false,
      },
    },
    'content_vector.model_id': {
      unmapped: {
        type: 'unmapped',
        metadata_field: false,
        searchable: false,
        aggregatable: false,
        indices: ['workplace_index'],
      },
      text: {
        type: 'text',
        metadata_field: false,
        searchable: true,
        aggregatable: false,
        indices: ['workplace_index2'],
      },
    },
    vector: {
      unmapped: {
        type: 'unmapped',
        metadata_field: false,
        searchable: false,
        aggregatable: false,
        indices: ['workplace_index2'],
      },
      object: {
        type: 'object',
        metadata_field: false,
        searchable: false,
        aggregatable: false,
        indices: ['workplace_index'],
      },
    },
    'text.keyword': {
      keyword: {
        type: 'keyword',
        metadata_field: false,
        searchable: true,
        aggregatable: true,
        indices: ['workplace_index'],
      },
      unmapped: {
        type: 'unmapped',
        metadata_field: false,
        searchable: false,
        aggregatable: false,
        indices: ['workplace_index2'],
      },
    },
    text: {
      unmapped: {
        type: 'unmapped',
        metadata_field: false,
        searchable: false,
        aggregatable: false,
        indices: ['workplace_index2'],
      },
      text: {
        type: 'text',
        metadata_field: false,
        searchable: true,
        aggregatable: false,
        indices: ['workplace_index'],
      },
    },
    'metadata.name': {
      text: {
        type: 'text',
        metadata_field: false,
        searchable: true,
        aggregatable: false,
      },
    },
  },
};

export const ELSER_PASSAGE_CHUNKED = {
  indices: ['search-nethys'],
  fields: {
    'ml.inference.body_content_expanded.is_truncated': {
      boolean: {
        type: 'boolean',
        metadata_field: false,
        searchable: true,
        aggregatable: true,
      },
    },
    ml: {
      object: {
        type: 'object',
        metadata_field: false,
        searchable: false,
        aggregatable: false,
      },
    },
    'ml.inference': {
      object: {
        type: 'object',
        metadata_field: false,
        searchable: false,
        aggregatable: false,
      },
    },
    body_content: {
      text: {
        type: 'text',
        metadata_field: false,
        searchable: true,
        aggregatable: false,
      },
    },
    headings: {
      text: {
        type: 'text',
        metadata_field: false,
        searchable: true,
        aggregatable: false,
      },
    },
    'ml.inference.body_content_expanded.model_id': {
      keyword: {
        type: 'keyword',
        metadata_field: false,
        searchable: true,
        aggregatable: true,
      },
    },
    title: {
      text: {
        type: 'text',
        metadata_field: false,
        searchable: true,
        aggregatable: false,
      },
    },
    'ml.inference.body_content_expanded.predicted_value': {
      sparse_vector: {
        type: 'sparse_vector',
        metadata_field: false,
        searchable: true,
        aggregatable: false,
      },
    },
  },
};

export const SPARSE_DOC_SINGLE_INDEX = {
  _index: 'search-nethys',
  _id: '662812de44a5e12074edcc6f',
  _score: 1,
  _ignored: ['body_content.enum'],
  _source: {
    last_crawled_at: '2024-04-23T20:05:14Z',
    additional_urls: ['https://2e.aonprd.com/Ancestries.aspx?ID=31'],
    body_content:
      "Ancestry Guide pg. 89 2.0 Fleshwarps are people whose forms were created or radically transformed by magic, alchemy, or unnatural energies. Their unorthodox appearance can make it difficult for them to find a place for themselves in the world. Magic and science that can warp bone and twist sinew are all too common on Golarion. Fleshwarps are those who have been permanently altered by such methods—sometimes a sapient being created whole cloth from inanimate flesh, but often a victim unwillingly transformed by strange energies or sadistic creators. The ancestry name “fleshwarp” is an umbrella term, since on Golarion the actual fleshwarping process is more infamously well-known than are alterations caused by uncontrolled magic, technology, or fringe science. Whether practiced by Thassilonian wizards, Nexian fleshcrafters, or the drow of the Darklands, fleshwarping is the craft of reshaping flesh and mind in vats of foul magical reagents. This has led some scholars of monsters to argue that only those beings created by traditional fleshwarping should be considered fleshwarps. Regardless of the source of their altered forms, fleshwarps bear their new shape forever, transformed beings living a wild and strange existence beyond what was possible for their original ancestry. Although fleshwarps are humanoid, no two look the same. One might possess limbs in unusual places and skin as smooth as glass, while another might have a thick matting of spiny fur. Some might have animalistic features, like a boar snout, scales, or cloven hooves. Others have entirely alien appearances, such as bulging eyes on the backs of their hands. Some may have only subtly uncanny features that differentiate them, such as glowing teeth, smoking eyes, or fingernails made of bone. The only commonality among fleshwarps is their mismatched nature. Let your imagination run wild when creating a fleshwarp character! If you want a character who is tough and hardy, can change their form as they grow, and can use their wholly unique appearance to inspire awe or fear in others, you should play a fleshwarp. You Might... Embrace your unusual appearance to inspire respect or fear. Be used to relying on yourself. Distrust large groups of people, particularly mobs, based on past experiences. Others Probably... Find your physiology fascinating or terrifying. Assume you are an expert on strange creatures or occult phenomena. Consider you an enigmatic and unpredictable—and perhaps even dangerous—outsider. Physical Description Fleshwarps are humanoids, ranging from 5 to 7 feet tall and from just under 100 pounds to more than 300 pounds. The proportion and appearance of their limbs and features differ widely, but fleshwarps functionally have two legs, two arms, and a single head; a fleshwarp with more limbs than this should consider an appropriate ancestry feat to reflect this variance, or one of their limbs might be vestigial and mostly nonfunctional. Fleshwarps differ widely in their appearance due to the unique circumstances of their creation. Even fleshwarp siblings or two people transformed through the same procedure might look wildly different. Society Fleshwarps are so few in number that congregations of them are rare. They most often live on their own, with a small family group, or at the outskirts of a community. Some thrive in cities, however, where they can remain anonymous among the crowds while pursuing careers that allow them to avoid contact with people who might fear or persecute them. Fleshwarps value endurance and are quick to learn from others, so those who come into contact with others of their kind usually share stories that help each other survive, hide, or thrive more effectively. How a fleshwarp formed can be a painful or horrifying subject, one they consider rude to discuss with anyone besides close friends or loved ones. Alignment and Religion Fleshwarps have little to gain from the broader society, and therefore rarely work to support society in turn, beyond perhaps helping other fleshwarps. They need to be able to adapt quickly to survive on their own. As a consequence, few fleshwarps are lawful. Although bigoted or short-sighted people view fleshwarps as monsters, fleshwarps are no more or less prone to evil than any other people, and most seek only to live their lives without trouble. Most are neutral in alignment, for while alienation doesn't force a fleshwarp to feel contempt for others, neither does it encourage a fleshwarp to avoid it. This is especially true for fleshwarps living in the societies that gave birth to their traumatic transformation. Fleshwarps aren't often casually religious; most either have little to do with faith at all (viewing themselves as scorned by the gods or simply seeing faith as impractical for survival) or are exceptionally devout. Religious fleshwarps often revere Arazni , Calistria , Desna , or Gozreh ; evil fleshwarps typically turn to Lamashtu , finding consolation in the Mother of Monsters. Adventurers Fleshwarps often live on the margins of society. The hermit , hunter , nomad , or street urchin backgrounds work well for many fleshwarps; others might be criminals , entertainers , or prisoners . The need to defend themselves leads many fleshwarps to become barbarians , fighters , rogues , or rangers . champions and druids are common callings among fleshwarps who seek to defend and better the lot of others of their kind. Names Fleshwarps can come from—and thus have names from—any culture or ancestry, but some give themselves new names after being transformed, whether to celebrate the change, recognize a new phase of their lives, or conceal their past identity. Many fleshwarps also carry a descriptive nickname granted to them by others, such as “Triple Handed,” “Barkfoot,” or “Many-Mouth.” Fleshwarps don't keep nicknames they find personally offensive, but they tend to keep ones that describe their distinctive appearances or that are given by people they care about. Sample Names Borble, Dag, Feff, Hurn, Kemp, Omber, Ostro, Shurni, Surm, Wumpin Other Information Fleshforges In the city of Ecanus, the archmage Nex created the Fleshforges—massive edifices that churn and tremble with the birth sequences' roar of smelting flesh and printing bone—to produce fleshwarp soldiers to fuel his war against Geb. The Fleshforgers still engineer a bedazzling array of fleshwarps here, from chimeric messengers, who meld house pet and golem, to disciplined scale-sheathed cataphracts and stupendous dreadnoughts, whose fists and footsteps bend steel and pulverize stone. Recently, the Fleshforges have experienced uninitiated activations with alarming frequency, delivering atypical fleshwarps unconfined by design purviews or production schedules. Ecanus's authorities fervently hunt these unlicensed creations, but some escape, lurching into the night to hide in the city's recesses or venturing afield into the Mana Wastes. Fleshwarp Legends Legends of famous fleshwarps travel quickly amid fleshwarp communities. Lady Kedley : A wealthy noble in a life she doesn't remember, Kedley emerged transformed from deep below Westcrown. She uses her family's vast fortune to aid other fleshwarps. Spinhead Vanluk : This Mana Wastes warlord brings mutants and fleshwarps under his banner. He (literally) has eyes in the back of his head. Fleshwarp Motives Fleshwarps have a variety of reasons for taking up the life of an adventurer. Some are turned out of their homes by an uncaring parent or a suspicious mob. Other fleshwarps travel to learn more about their own transformation or to seek out others of their kind. A few even actively seek the means—either technological or magical—to undo their transformations or adopt a new form that won't incite repulsion or fear in common people. Still others understand that a good way to earn respect is to solve a community's problems—then quickly leave the area—and therefore fall into the role of itinerant adventurers-for-hire. Fleshwarp Settlements No settlements consisting entirely of fleshwarps exist openly outside of the Mana Wastes; elsewhere, citizens keep the secret so well that their community's existence isn't known to the world at large. Fleshwarps are more likely to live on the fringes of other settlements, working in industries where their hardy constitution is an advantage and their uncanny appearance isn't a liability. Some are herbalists or trappers, working in the wilderness and interacting with others only rarely. Locals might come to consider a fleshwarp their equal or friend, and take umbrage at outsiders who make a big deal out of the “monster” in their midst. Sentiment might turn quickly upon supernatural events or strange attacks, however, and, tragically, more than a few fleshwarps have been turned out of homes they've occupied for decades when faced with a misguided mob. The Mana Wastes The Mana Wastes are the vast swaths of desolation adjoining once-warring Geb and Nex. Over more than a thousand years, both nations' unrestricted use of magical fusillades, creeping plagues, and other atrocities of spellcraft transformed a once fertile and beautiful land into a desert where reality screams and bleeds. Wellspring surges of magic form into riptides and whirlwinds of chaotic force throughout the Mana Wastes, rending and twisting everything in their path. Many fleshwarps make their homes in this inhospitable land. Some are native to the region, mutated by the Mana Wastes' volatile outbursts, while others are exiles and refugees from across the Impossible Lands who find the otherworldly hazards of the Mana Wastes preferable to the all-too-worldly persecution of their former homelands and compatriots. Fleshwarp Mechanics Hit Points 10 Size Medium or Small Speed 25 feet Ability Boosts Constitution Free Languages Common Additional languages equal to your Intelligence modifier (if positive). Choose from Aklo , Draconic , Dwarven , Elven , Goblin , Undercommon , and any other languages to which you have access (such as the languages prevalent in your region). Low-Light Vision You can see in dim light as though it were bright light, and you ignore the concealed condition due to dim light. Unusual Anatomy Your unorthodox body resists physical afflictions meant for other creatures. You gain a +1 circumstance bonus to saves against diseases and poisons .",
    domains: ['https://2e.aonprd.com'],
    title: 'Fleshwarp - Ancestries - Archives of Nethys: Pathfinder 2nd Edition Database',
    meta_keywords:
      'Archives, Nethys, Wiki, Archives of Nethys, Pathfinder, Official, AoN, AoNPRD, PRD, PFSRD, 2E, 2nd Edition, Ancestries, Ancestry, Fleshwarp',
    url: 'https://2e.aonprd.com/Ancestries.aspx?ID=31',
    url_scheme: 'https',
    meta_description:
      'Magic and science that can warp bone and twist sinew are all too common on Golarion. Fleshwarps are those who have been permanently altered by such methods—sometimes a sapient being created whole cloth from inanimate flesh, but often a victim unwillingly transformed by strange energies or sadistic creators.<br /><br /> The ancestry name “fleshwarp” is an umbrella term, since on Golarion the actual fleshwarping process is more infamously well-known than are alterations caused by uncontrolled magic, technology, or fringe science. Whether practiced by Thassilonian wizards, Nexian fleshcrafters, or the drow of the Darklands, fleshwarping is the craft of reshaping flesh and mind in vats of foul magical reagents. This has led some scholars of monsters to argue that only those beings created by traditional fleshwarping should be considered fleshwarps. Regardless of the source of their altered forms, fleshwarps bear their new shape forever, transformed beings living a wild and strange existence beyond what w…',
    _ingest: {
      processors: [
        {
          pipeline: 'ml.inference.nethys',
          model_version: '12.0.0',
          types: ['pytorch', 'text_expansion'],
          processed_timestamp: '2024-04-23T20:05:15.723072191Z',
        },
      ],
    },
    headings: ['Alchemist'],
    links: ['https://2e.aonprd.com/Causes.aspx'],
    id: '662812de44a5e12074edcc6f',
    url_port: 443,
    url_host: '2e.aonprd.com',
    url_path: '/Ancestries.aspx',
    url_path_dir1: 'Ancestries.aspx',
    ml: {
      inference: {
        body_content_expanded: {
          predicted_value: {},
          is_truncated: true,
          model_id: '.elser_model_2_linux-x86_64',
        },
      },
    },
  },
};

export const DENSE_PASSAGE_FIRST_SINGLE_INDEX_FIELD_CAPS = {
  indices: ['search-example-main'],
  fields: {
    'page_content_key.keyword': {
      keyword: {
        type: 'keyword',
        metadata_field: false,
        searchable: true,
        aggregatable: true,
      },
    },
    page_content_ner: {
      object: {
        type: 'object',
        metadata_field: false,
        searchable: false,
        aggregatable: false,
      },
    },
    page_content_key: {
      text: {
        type: 'text',
        metadata_field: false,
        searchable: true,
        aggregatable: false,
      },
    },
    'page_content_ner.entities.end_pos': {
      integer: {
        type: 'integer',
        metadata_field: false,
        searchable: true,
        aggregatable: true,
      },
    },
    'label.keyword': {
      keyword: {
        type: 'keyword',
        metadata_field: false,
        searchable: true,
        aggregatable: true,
      },
    },
    'page_content_ner.entities.class_name': {
      keyword: {
        type: 'keyword',
        metadata_field: false,
        searchable: true,
        aggregatable: true,
      },
    },
    'page_content_e5_embbeding.model_id': {
      text: {
        type: 'text',
        metadata_field: false,
        searchable: true,
        aggregatable: false,
      },
    },
    title: {
      text: {
        type: 'text',
        metadata_field: false,
        searchable: true,
        aggregatable: false,
      },
    },
    'page_content_ner.entities.entity': {
      keyword: {
        type: 'keyword',
        metadata_field: false,
        searchable: true,
        aggregatable: true,
      },
    },
    'page_content_e5_embbeding.predicted_value': {
      dense_vector: {
        type: 'dense_vector',
        metadata_field: false,
        searchable: true,
        aggregatable: false,
      },
    },
    'title.keyword': {
      keyword: {
        type: 'keyword',
        metadata_field: false,
        searchable: true,
        aggregatable: true,
      },
    },
    page_id: {
      keyword: {
        type: 'keyword',
        metadata_field: false,
        searchable: true,
        aggregatable: true,
      },
    },
    page_content_e5_embbeding: {
      object: {
        type: 'object',
        metadata_field: false,
        searchable: false,
        aggregatable: false,
      },
    },
    category_id: {
      keyword: {
        type: 'keyword',
        metadata_field: false,
        searchable: true,
        aggregatable: true,
      },
    },
    'page_content_ner.entities.start_pos': {
      integer: {
        type: 'integer',
        metadata_field: false,
        searchable: true,
        aggregatable: true,
      },
    },
    'main_button.button_title': {
      text: {
        type: 'text',
        metadata_field: false,
        searchable: true,
        aggregatable: false,
      },
    },
    'main_button.keyword': {
      keyword: {
        type: 'keyword',
        metadata_field: false,
        searchable: true,
        aggregatable: true,
      },
    },
    'main_button.button_title.keyword': {
      keyword: {
        type: 'keyword',
        metadata_field: false,
        searchable: true,
        aggregatable: true,
      },
    },
    'bread_crumbs.keyword': {
      keyword: {
        type: 'keyword',
        metadata_field: false,
        searchable: true,
        aggregatable: true,
      },
    },
    main_button: {
      object: {
        type: 'object',
        metadata_field: false,
        searchable: false,
        aggregatable: false,
      },
    },
    'page_content_ner.entities': {
      object: {
        type: 'object',
        metadata_field: false,
        searchable: false,
        aggregatable: false,
      },
    },
    page_notification: {
      text: {
        type: 'text',
        metadata_field: false,
        searchable: true,
        aggregatable: false,
      },
    },
    buttons: {
      object: {
        type: 'object',
        metadata_field: false,
        searchable: false,
        aggregatable: false,
      },
    },
    'buttons.button_title.keyword': {
      keyword: {
        type: 'keyword',
        metadata_field: false,
        searchable: true,
        aggregatable: true,
      },
    },
    'main_button.button_new_tab': {
      keyword: {
        type: 'keyword',
        metadata_field: false,
        searchable: true,
        aggregatable: true,
      },
    },
    label: {
      keyword: {
        type: 'keyword',
        metadata_field: false,
        searchable: true,
        aggregatable: true,
      },
    },
    bread_crumbs: {
      text: {
        type: 'text',
        metadata_field: false,
        searchable: true,
        aggregatable: false,
      },
    },
    'page_content_ner.predicted_value': {
      keyword: {
        type: 'keyword',
        metadata_field: false,
        searchable: true,
        aggregatable: true,
      },
    },
    url: {
      text: {
        type: 'text',
        metadata_field: false,
        searchable: true,
        aggregatable: false,
      },
    },
    'url.keyword': {
      keyword: {
        type: 'keyword',
        metadata_field: false,
        searchable: true,
        aggregatable: true,
      },
    },
    page_content_text: {
      text: {
        type: 'text',
        metadata_field: false,
        searchable: true,
        aggregatable: false,
      },
    },
    'buttons.button_title': {
      text: {
        type: 'text',
        metadata_field: false,
        searchable: true,
        aggregatable: false,
      },
    },
    'page_content_e5_embbeding.model_id.keyword': {
      keyword: {
        type: 'keyword',
        metadata_field: false,
        searchable: true,
        aggregatable: true,
      },
    },
    'page_notification.keyword': {
      keyword: {
        type: 'keyword',
        metadata_field: false,
        searchable: true,
        aggregatable: true,
      },
    },
    'page_content_ner.model_id': {
      keyword: {
        type: 'keyword',
        metadata_field: false,
        searchable: true,
        aggregatable: true,
      },
    },
    filter_list: {
      text: {
        type: 'text',
        metadata_field: false,
        searchable: true,
        aggregatable: false,
      },
    },
    'buttons.button_link': {
      text: {
        type: 'text',
        metadata_field: false,
        searchable: true,
        aggregatable: false,
      },
    },
    'page_content_ner.entities.class_probability': {
      float: {
        type: 'float',
        metadata_field: false,
        searchable: true,
        aggregatable: true,
      },
    },
    'buttons.button_new_tab': {
      text: {
        type: 'text',
        metadata_field: false,
        searchable: true,
        aggregatable: false,
      },
    },
    title_text: {
      text: {
        type: 'text',
        metadata_field: false,
        searchable: true,
        aggregatable: false,
      },
    },
    'main_button.button_link': {
      text: {
        type: 'text',
        metadata_field: false,
        searchable: true,
        aggregatable: false,
      },
    },
    page_content: {
      keyword: {
        type: 'keyword',
        metadata_field: false,
        searchable: true,
        aggregatable: true,
      },
    },
    updated_date: {
      date: {
        type: 'date',
        metadata_field: false,
        searchable: true,
        aggregatable: true,
      },
    },
    'buttons.button_link.keyword': {
      keyword: {
        type: 'keyword',
        metadata_field: false,
        searchable: true,
        aggregatable: true,
      },
    },
  },
};

export const DENSE_PASSAGE_FIRST_SINGLE_INDEX_DOC = {
  _index: 'search-example-main',
  _id: 'id',
  _version: 1,
  _seq_no: 2,
  _primary_term: 1,
  found: true,
  _source: {
    page_notification: '-',
    'main_button.button_new_tab': '-',
    page_content_key: '',
    label: '',
    bread_crumbs: 'breadcrumbs',
    title: 'title',
    type: '11',
    url: '/',
    page_content_text: 'page_content_text',
    page_id: '2,061',
    'buttons.button_title': '-',
    page_content_e5_embbeding: {
      predicted_value: [0.09232209622859955],
      model_id: '.multilingual-e5-small_linux-x86_64',
    },
    category_id: 'category_id',
    filter_list: 'filter',
    'buttons.button_link': '-',
    'buttons.button_new_tab': '-',
    'main_button.button_title': '-',
    title_text: 'title_text',
    'main_button.button_link': '-',
    page_content: 'bla',
    updated_date: '2024-03-21T11:23:12.503000',
    title_keyword: 'title_keyword',
  },
};
