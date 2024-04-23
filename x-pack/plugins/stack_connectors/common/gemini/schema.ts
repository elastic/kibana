/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* Request Schema Single Text */ 
// {
//   "contents": [
//     {
//       "parts": [
//         {
//           "text": "Write a story about a magic backpack."
//         }
//       ]
//     }
//   ]
// }

/* Request Schema Multi Text (chat) */ 


// {
//   "contents": [
//     {"role":"user",
//      "parts":[{
//        "text": "Write the first line of a story about a magic backpack."}]},
//     {"role": "model",
//      "parts":[{
//        "text": "In the bustling city of Meadow brook, lived a young girl named Sophie. She was a bright and curious soul with an imaginative mind."}]},
//     {"role": "user",
//      "parts":[{
//        "text": "Can you set it in a quiet village in 1600s France?"}]},
//   ]
// }

/* Response Schema */ 

// {
//   "candidates": [
//     {
//       "content": {
//         "parts": [
//           {
//             "text": "In the bustling metropolis of Crestwood, amidst the towering skyscrapers and vibrant streets, resided an unassuming high school student named Anya. Unbeknownst to her, her life was about to take an extraordinary turn when she stumbled upon a mysterious backpack tucked away in a forgotten corner of her attic.\n\nIntrigued, Anya reached out and unzipped the backpack's weathered exterior. To her astonishment, it was not empty as she had expected, but instead held a swirling vortex of shimmering colors. A soft glow emanated from within, illuminating the attic with an ethereal light.\n\nAs Anya cautiously peered into the vortex, she felt an inexplicable pull towards it. Driven by an irresistible curiosity, she reached out and touched the swirling colors. In that instant, a surge of energy coursed through her body, and the world around her transformed.\n\nThe attic faded away, replaced by a vast and otherworldly landscape. Verdant hills stretched out before her, dotted with shimmering lakes and ancient trees. Anya stood in awe, marveling at the surreal beauty that enveloped her.\n\nBut the backpack was not merely a portal to a magical realm. As Anya explored her surroundings, she discovered that it possessed extraordinary abilities. By simply whispering a command, she could summon objects from thin air, such as a refreshing drink on a hot day or a cozy blanket for a cold night.\n\nMoreover, the backpack had a profound connection to nature. Anya learned that she could manipulate plants with ease, coaxing them to bloom out of season or to shield her from the elements. With every passing day, her understanding of the backpack's powers grew.\n\nWord of Anya's magical backpack spread throughout Crestwood, attracting the attention of both curiosity and envy. Some sought her out for its extraordinary capabilities, while others plotted to steal it for their own selfish gain.\n\nUndeterred, Anya embraced the responsibility that came with her newfound powers. She used the backpack to help those in need, heal the sick, and protect the innocent. Crestwood became a sanctuary under her watchful eye, where the boundaries between reality and magic blurred.\n\nAnd so, the legend of the magic backpack lived on, a testament to the unfathomable power that can reside in the most ordinary of objects when guided by a heart filled with kindness and wonder."
//           }
//         ],
//         "role": "model"
//       },
//       "finishReason": "STOP",
//       "index": 0,
//       "safetyRatings": [
//         {
//           "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT",
//           "probability": "NEGLIGIBLE"
//         },
//         {
//           "category": "HARM_CATEGORY_HATE_SPEECH",
//           "probability": "NEGLIGIBLE"
//         },
//         {
//           "category": "HARM_CATEGORY_HARASSMENT",
//           "probability": "NEGLIGIBLE"
//         },
//         {
//           "category": "HARM_CATEGORY_DANGEROUS_CONTENT",
//           "probability": "NEGLIGIBLE"
//         }
//       ]
//     }
//   ]
// }


import { schema } from '@kbn/config-schema';
import { DEFAULT_GEMINI_MODEL } from './constants';

// Connector schema
export const ConfigSchema = schema.object({
  apiUrl: schema.string(),
  defaultModel: schema.string({ defaultValue: DEFAULT_GEMINI_MODEL }),
});

export const SecretsSchema = schema.object({
  accessKey: schema.string(),
  secret: schema.string(),
  apiKey: schema.string(),
});

export const RunActionParamsSchema = schema.object({
  body: schema.string(),
  model: schema.maybe(schema.string()),
});

export const InvokeAIActionParamsSchema = schema.object({
  messages: schema.any(),
  // messages: schema.arrayOf(
  //   schema.object({
  //     role: schema.string(),
  //     content: schema.string(),
  //   })
  // ),
  model: schema.maybe(schema.string()),
  // temperature: schema.maybe(schema.number()),
  // stopSequences: schema.maybe(schema.arrayOf(schema.string())),
  // system: schema.maybe(schema.string()),
});

export const InvokeAIActionResponseSchema = schema.object({
  message: schema.string(),
});

export const StreamActionParamsSchema = schema.object({
  body: schema.string(),
  model: schema.maybe(schema.string()),
});

// export const RunApiLatestResponseSchema = schema.object(
//   {
//     stop_reason: schema.maybe(schema.string()),
//     usage: schema.object({
//       input_tokens: schema.number(),
//       output_tokens: schema.number(),
//     }),
//     content: schema.arrayOf(
//       schema.object(
//         { type: schema.string(), text: schema.maybe(schema.string()) },
//         { unknowns: 'allow' }
//       )
//     ),
//   },
//   { unknowns: 'allow' }
// );

export const RunApiLatestResponseSchema = schema.object(
  {
      candidates: schema.any()
  }
);

export const RunActionResponseSchema = schema.object(
  {
    completion: schema.string(),
    stop_reason: schema.maybe(schema.string()),
    usage: schema.maybe(
      schema.object({
        input_tokens: schema.number(),
        output_tokens: schema.number(),
      })
    ),
  },
  { unknowns: 'ignore' }
);

export const StreamingResponseSchema = schema.any();

// Run action schema
export const DashboardActionParamsSchema = schema.object({
  dashboardId: schema.string(),
});

export const DashboardActionResponseSchema = schema.object({
  available: schema.boolean(),
});
